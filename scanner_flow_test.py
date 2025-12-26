import requests
import json
from datetime import datetime

class ScannerFlowTester:
    def __init__(self, base_url="https://venuepass-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.admin_token = None
        self.test_event_id = None
        self.test_ticket_id = None

    def register_admin(self):
        """Register a new admin user"""
        test_email = f"scanner_test_{datetime.now().strftime('%H%M%S')}@example.com"
        data = {
            "email": test_email,
            "password": "testpass123",
            "role": "admin"
        }
        
        try:
            response = requests.post(f"{self.api_url}/auth/register", json=data)
            if response.status_code == 200:
                result = response.json()
                self.admin_token = result.get('token')
                print(f"✅ Admin registered successfully: {test_email}")
                return True
            else:
                print(f"❌ Admin registration failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Admin registration error: {str(e)}")
            return False

    def create_event(self):
        """Create a test event"""
        if not self.admin_token:
            print("❌ No admin token available")
            return False
            
        data = {
            "name": "Scanner Test Concert",
            "venue": "Test Arena",
            "date": "2025-12-31",
            "time": "20:00"
        }
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        try:
            response = requests.post(f"{self.api_url}/events", json=data, headers=headers)
            if response.status_code == 200:
                result = response.json()
                self.test_event_id = result.get('event_id')
                print(f"✅ Event created successfully: {self.test_event_id}")
                return True
            else:
                print(f"❌ Event creation failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Event creation error: {str(e)}")
            return False

    def generate_ticket(self):
        """Generate a test ticket"""
        if not self.admin_token or not self.test_event_id:
            print("❌ No admin token or event ID available")
            return False
            
        data = {
            "event_id": self.test_event_id,
            "recipient_email": "jacobdrawhorn@proton.me",  # Use the verified email from logs
            "count": 1
        }
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        try:
            response = requests.post(f"{self.api_url}/tickets/generate", json=data, headers=headers)
            if response.status_code == 200:
                result = response.json()
                if result.get('tickets'):
                    self.test_ticket_id = result['tickets'][0]['ticket_id']
                    print(f"✅ Ticket generated successfully: {self.test_ticket_id}")
                    return True
            else:
                print(f"❌ Ticket generation failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Ticket generation error: {str(e)}")
            return False

    def scan_ticket_first_time(self):
        """Test scanning ticket for the first time (should succeed)"""
        if not self.admin_token or not self.test_ticket_id:
            print("❌ No token or ticket ID available")
            return False
            
        data = {"ticket_id": self.test_ticket_id}
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        try:
            response = requests.post(f"{self.api_url}/tickets/scan", json=data, headers=headers)
            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    print(f"✅ First scan successful: {result.get('message')}")
                    print(f"   Event: {result.get('event_name')}")
                    print(f"   Scan time: {result.get('scan_timestamp')}")
                    return True
                else:
                    print(f"❌ First scan failed: {result.get('message')}")
                    return False
            else:
                print(f"❌ First scan API error: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ First scan error: {str(e)}")
            return False

    def scan_ticket_second_time(self):
        """Test scanning same ticket again (should fail with already used message)"""
        if not self.admin_token or not self.test_ticket_id:
            print("❌ No token or ticket ID available")
            return False
            
        data = {"ticket_id": self.test_ticket_id}
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        try:
            response = requests.post(f"{self.api_url}/tickets/scan", json=data, headers=headers)
            if response.status_code == 200:
                result = response.json()
                if not result.get('success'):
                    print(f"✅ Anti-rescan working: {result.get('message')}")
                    print(f"   Original scan time: {result.get('original_scan_time')}")
                    return True
                else:
                    print(f"❌ Anti-rescan failed - ticket scanned again successfully")
                    return False
            else:
                print(f"❌ Second scan API error: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Second scan error: {str(e)}")
            return False

    def run_complete_flow(self):
        """Run the complete scanner flow test"""
        print("🎸 Starting Complete Scanner Flow Test 🎸\n")
        
        # Step 1: Register admin
        if not self.register_admin():
            return False
        
        # Step 2: Create event
        if not self.create_event():
            return False
        
        # Step 3: Generate ticket
        if not self.generate_ticket():
            return False
        
        # Step 4: First scan (should succeed)
        if not self.scan_ticket_first_time():
            return False
        
        # Step 5: Second scan (should fail with anti-rescan)
        if not self.scan_ticket_second_time():
            return False
        
        print("\n✅ Complete Scanner Flow Test PASSED")
        print(f"Ticket ID for UI testing: {self.test_ticket_id}")
        return True

def main():
    tester = ScannerFlowTester()
    success = tester.run_complete_flow()
    
    # Save ticket info for UI testing
    if success and tester.test_ticket_id:
        with open('/app/test_ticket_info.json', 'w') as f:
            json.dump({
                'ticket_id': tester.test_ticket_id,
                'event_id': tester.test_event_id,
                'admin_token': tester.admin_token,
                'status': 'scanned'  # Already scanned in the test
            }, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    exit(main())