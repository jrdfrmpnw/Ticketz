from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import qrcode
from io import BytesIO
import base64
import asyncio
import resend

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

# Resend Configuration
RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
resend.api_key = RESEND_API_KEY

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# Models
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    role: str = "admin"  # admin or staff

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    role: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Event(BaseModel):
    model_config = ConfigDict(extra="ignore")
    event_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    venue: str
    date: str
    time: str
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EventCreate(BaseModel):
    name: str
    venue: str
    date: str
    time: str

class Ticket(BaseModel):
    model_config = ConfigDict(extra="ignore")
    ticket_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_id: str
    status: str = "unused"  # unused or scanned
    scan_timestamp: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TicketGenerate(BaseModel):
    event_id: str
    recipient_email: EmailStr
    count: int = 1

class TicketScan(BaseModel):
    ticket_id: str

class ScanResult(BaseModel):
    success: bool
    message: str
    ticket_id: str
    event_name: Optional[str] = None
    scan_timestamp: Optional[datetime] = None
    original_scan_time: Optional[datetime] = None

# Helper Functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_jwt_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_jwt_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    token = credentials.credentials
    return decode_jwt_token(token)

def generate_qr_code(data: str) -> str:
    """Generate QR code and return as base64 string"""
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    buffered = BytesIO()
    img.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode()
    return f"data:image/png;base64,{img_str}"

async def send_ticket_email(recipient_email: str, event_name: str, ticket_id: str, qr_code_data: str):
    """Send ticket via email using Resend"""
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; background: #050505; color: #EEEEEE; padding: 20px; }}
            .ticket {{ max-width: 600px; margin: 0 auto; background: #1E1E1E; border: 2px dashed #444; padding: 40px; text-align: center; }}
            h1 {{ color: #00FF94; text-transform: uppercase; font-size: 32px; margin-bottom: 10px; }}
            .event-name {{ font-size: 24px; margin: 20px 0; }}
            .ticket-id {{ font-family: monospace; background: #050505; padding: 10px; margin: 20px 0; border: 1px solid #333; }}
            img {{ max-width: 300px; margin: 20px 0; }}
            .instructions {{ color: #888; font-size: 14px; margin-top: 30px; }}
        </style>
    </head>
    <body>
        <div class="ticket">
            <h1>🎸 YOUR TICKET 🎸</h1>
            <div class="event-name">{event_name}</div>
            <img src="{qr_code_data}" alt="QR Code" />
            <div class="ticket-id">TICKET ID: {ticket_id}</div>
            <div class="instructions">
                Show this QR code at the venue entrance.<br/>
                This ticket can only be scanned once.
            </div>
        </div>
    </body>
    </html>
    """
    
    params = {
        "from": SENDER_EMAIL,
        "to": [recipient_email],
        "subject": f"Your Ticket for {event_name}",
        "html": html_content
    }
    
    try:
        await asyncio.to_thread(resend.Emails.send, params)
    except Exception as e:
        logging.error(f"Failed to send email: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")

# Routes
@api_router.get("/")
async def root():
    return {"message": "VenuePass API"}

# Auth Routes
@api_router.post("/auth/register")
async def register(user_data: UserRegister):
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user = User(
        email=user_data.email,
        role=user_data.role
    )
    user_dict = user.model_dump()
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    user_dict['password_hash'] = hash_password(user_data.password)
    
    await db.users.insert_one(user_dict)
    
    token = create_jwt_token(user.user_id, user.email, user.role)
    return {"token": token, "user": user.model_dump()}

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_jwt_token(user['user_id'], user['email'], user['role'])
    user.pop('password_hash', None)
    return {"token": token, "user": user}

# Event Routes
@api_router.post("/events", response_model=Event)
async def create_event(event_data: EventCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Only admins can create events")
    
    event = Event(
        name=event_data.name,
        venue=event_data.venue,
        date=event_data.date,
        time=event_data.time,
        created_by=current_user['user_id']
    )
    
    event_dict = event.model_dump()
    event_dict['created_at'] = event_dict['created_at'].isoformat()
    
    await db.events.insert_one(event_dict)
    return event

@api_router.get("/events", response_model=List[Event])
async def get_events(current_user: dict = Depends(get_current_user)):
    events = await db.events.find({}, {"_id": 0}).to_list(1000)
    for event in events:
        if isinstance(event.get('created_at'), str):
            event['created_at'] = datetime.fromisoformat(event['created_at'])
    return events

@api_router.get("/events/{event_id}", response_model=Event)
async def get_event(event_id: str, current_user: dict = Depends(get_current_user)):
    event = await db.events.find_one({"event_id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if isinstance(event.get('created_at'), str):
        event['created_at'] = datetime.fromisoformat(event['created_at'])
    return event

@api_router.delete("/events/{event_id}")
async def delete_event(event_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Only admins can delete events")
    
    # Check if event exists
    event = await db.events.find_one({"event_id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Delete all tickets associated with this event
    await db.tickets.delete_many({"event_id": event_id})
    
    # Delete the event
    result = await db.events.delete_one({"event_id": event_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    
    return {"success": True, "message": "Event and associated tickets deleted successfully"}

# Ticket Routes
@api_router.post("/tickets/generate")
async def generate_tickets(ticket_data: TicketGenerate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Only admins can generate tickets")
    
    # Verify event exists
    event = await db.events.find_one({"event_id": ticket_data.event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    tickets = []
    for _ in range(ticket_data.count):
        ticket = Ticket(event_id=ticket_data.event_id)
        ticket_dict = ticket.model_dump()
        ticket_dict['created_at'] = ticket_dict['created_at'].isoformat()
        
        await db.tickets.insert_one(ticket_dict)
        
        # Generate QR code
        qr_code_data = generate_qr_code(ticket.ticket_id)
        
        # Send email
        try:
            await send_ticket_email(
                ticket_data.recipient_email,
                event['name'],
                ticket.ticket_id,
                qr_code_data
            )
        except Exception as e:
            logging.error(f"Email send failed: {e}")
        
        tickets.append({**ticket.model_dump(), "qr_code": qr_code_data})
    
    return {"success": True, "tickets": tickets, "count": len(tickets)}

@api_router.post("/tickets/scan", response_model=ScanResult)
async def scan_ticket(scan_data: TicketScan, current_user: dict = Depends(get_current_user)):
    # Use atomic update to prevent race conditions
    result = await db.tickets.find_one_and_update(
        {"ticket_id": scan_data.ticket_id, "status": "unused"},
        {
            "$set": {
                "status": "scanned",
                "scan_timestamp": datetime.now(timezone.utc).isoformat()
            }
        },
        projection={"_id": 0}
    )
    
    if result:
        # Success - first scan
        event = await db.events.find_one({"event_id": result['event_id']}, {"_id": 0})
        return ScanResult(
            success=True,
            message="Ticket scanned successfully",
            ticket_id=scan_data.ticket_id,
            event_name=event['name'] if event else "Unknown",
            scan_timestamp=datetime.now(timezone.utc)
        )
    else:
        # Check if ticket exists but already scanned
        ticket = await db.tickets.find_one({"ticket_id": scan_data.ticket_id}, {"_id": 0})
        
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")
        
        if ticket['status'] == 'scanned':
            original_time = ticket.get('scan_timestamp')
            if isinstance(original_time, str):
                original_time = datetime.fromisoformat(original_time)
            
            return ScanResult(
                success=False,
                message="Ticket Already Used",
                ticket_id=scan_data.ticket_id,
                original_scan_time=original_time
            )
        
        raise HTTPException(status_code=400, detail="Invalid ticket status")

@api_router.get("/events/{event_id}/stats")
async def get_event_stats(event_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Only admins can view stats")
    
    total_tickets = await db.tickets.count_documents({"event_id": event_id})
    scanned_tickets = await db.tickets.count_documents({"event_id": event_id, "status": "scanned"})
    
    return {
        "event_id": event_id,
        "total_generated": total_tickets,
        "total_scanned": scanned_tickets,
        "unused": total_tickets - scanned_tickets
    }

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()