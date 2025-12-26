import requests
import sys
import json
from datetime import datetime

class VenuePassAPITester:
    def __init__(self, base_url="https://venuepass-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.admin_token = None
        self.staff_token = None
        self.test_event_id = None
        self.test_ticket_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
        
        result = {
            "test": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}")
        if details:
            print(f"    {details}")

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            
            if not success:
                details += f" (Expected: {expected_status})"
                try:
                    error_data = response.json()
                    details += f" - {error_data.get('detail', 'No error details')}"
                except:
                    details += f" - {response.text[:100]}"
            
            self.log_test(name, success, details)
            
            if success:
                try:
                    return response.json()
                except:
                    return {}
            return None

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return None

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test("Root API Endpoint", "GET", "", 200)

    def test_admin_registration(self):
        """Test admin user registration"""
        test_email = f"admin_test_{datetime.now().strftime('%H%M%S')}@example.com"
        data = {
            "email": test_email,
            "password": "testpass123",
            "role": "admin"
        }
        result = self.run_test("Admin Registration", "POST", "auth/register", 200, data)
        if result:
            self.admin_token = result.get('token')
            return True
        return False

    def test_staff_registration(self):
        """Test staff user registration"""
        test_email = f"staff_test_{datetime.now().strftime('%H%M%S')}@example.com"
        data = {
            "email": test_email,
            "password": "testpass123",
            "role": "staff"
        }
        result = self.run_test("Staff Registration", "POST", "auth/register", 200, data)
        if result:
            self.staff_token = result.get('token')
            return True
        return False

    def test_admin_login(self):
        """Test admin login with test credentials"""
        data = {
            "email": "test@example.com",
            "password": "testpass123"
        }
        result = self.run_test("Admin Login", "POST", "auth/login", 200, data)
        if result:
            self.admin_token = result.get('token')
            return True
        return False

    def test_invalid_login(self):
        """Test login with invalid credentials"""
        data = {
            "email": "invalid@example.com",
            "password": "wrongpassword"
        }
        return self.run_test("Invalid Login", "POST", "auth/login", 401, data)

    def test_create_event(self):
        """Test event creation (admin only)"""
        if not self.admin_token:
            self.log_test("Create Event", False, "No admin token available")
            return False
            
        data = {
            "name": "Test Concert 2025",
            "venue": "Test Arena",
            "date": "2025-12-31",
            "time": "20:00"
        }
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        result = self.run_test("Create Event", "POST", "events", 200, data, headers)
        if result:
            self.test_event_id = result.get('event_id')
            return True
        return False

    def test_staff_create_event_forbidden(self):
        """Test that staff cannot create events"""
        if not self.staff_token:
            self.log_test("Staff Create Event (Forbidden)", False, "No staff token available")
            return False
            
        data = {
            "name": "Unauthorized Event",
            "venue": "Test Arena",
            "date": "2025-12-31",
            "time": "20:00"
        }
        headers = {"Authorization": f"Bearer {self.staff_token}"}
        return self.run_test("Staff Create Event (Forbidden)", "POST", "events", 403, data, headers)

    def test_get_events(self):
        """Test getting events list"""
        if not self.admin_token:
            self.log_test("Get Events", False, "No admin token available")
            return False
            
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        return self.run_test("Get Events", "GET", "events", 200, headers=headers)

    def test_get_event_details(self):
        """Test getting specific event details"""
        if not self.admin_token or not self.test_event_id:
            self.log_test("Get Event Details", False, "No admin token or event ID available")
            return False
            
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        return self.run_test("Get Event Details", "GET", f"events/{self.test_event_id}", 200, headers=headers)

    def test_generate_tickets(self):
        """Test ticket generation"""
        if not self.admin_token or not self.test_event_id:
            self.log_test("Generate Tickets", False, "No admin token or event ID available")
            return False
            
        data = {
            "event_id": self.test_event_id,
            "recipient_email": "test@example.com",
            "count": 2
        }
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        result = self.run_test("Generate Tickets", "POST", "tickets/generate", 200, data, headers)
        if result and result.get('tickets'):
            self.test_ticket_id = result['tickets'][0]['ticket_id']
            return True
        return False

    def test_staff_generate_tickets_forbidden(self):
        """Test that staff cannot generate tickets"""
        if not self.staff_token or not self.test_event_id:
            self.log_test("Staff Generate Tickets (Forbidden)", False, "No staff token or event ID available")
            return False
            
        data = {
            "event_id": self.test_event_id,
            "recipient_email": "test@example.com",
            "count": 1
        }
        headers = {"Authorization": f"Bearer {self.staff_token}"}
        return self.run_test("Staff Generate Tickets (Forbidden)", "POST", "tickets/generate", 403, data, headers)

    def test_scan_ticket_first_time(self):
        """Test scanning ticket for the first time (should succeed)"""
        if not self.admin_token or not self.test_ticket_id:
            self.log_test("Scan Ticket (First Time)", False, "No token or ticket ID available")
            return False
            
        data = {"ticket_id": self.test_ticket_id}
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        result = self.run_test("Scan Ticket (First Time)", "POST", "tickets/scan", 200, data, headers)
        if result:
            return result.get('success', False)
        return False

    def test_scan_ticket_second_time(self):
        """Test scanning same ticket again (should fail with already used)"""
        if not self.admin_token or not self.test_ticket_id:
            self.log_test("Scan Ticket (Second Time)", False, "No token or ticket ID available")
            return False
            
        data = {"ticket_id": self.test_ticket_id}
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        result = self.run_test("Scan Ticket (Second Time)", "POST", "tickets/scan", 200, data, headers)
        if result:
            # Should return success=False for already used ticket
            return not result.get('success', True)
        return False

    def test_scan_invalid_ticket(self):
        """Test scanning non-existent ticket"""
        if not self.admin_token:
            self.log_test("Scan Invalid Ticket", False, "No token available")
            return False
            
        data = {"ticket_id": "invalid-ticket-id"}
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        return self.run_test("Scan Invalid Ticket", "POST", "tickets/scan", 404, data, headers)

    def test_event_stats(self):
        """Test getting event statistics"""
        if not self.admin_token or not self.test_event_id:
            self.log_test("Event Statistics", False, "No admin token or event ID available")
            return False
            
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        return self.run_test("Event Statistics", "GET", f"events/{self.test_event_id}/stats", 200, headers=headers)

    def test_staff_event_stats_forbidden(self):
        """Test that staff cannot view event statistics"""
        if not self.staff_token or not self.test_event_id:
            self.log_test("Staff Event Stats (Forbidden)", False, "No staff token or event ID available")
            return False
            
        headers = {"Authorization": f"Bearer {self.staff_token}"}
        return self.run_test("Staff Event Stats (Forbidden)", "GET", f"events/{self.test_event_id}/stats", 403, headers=headers)

    def test_unauthorized_access(self):
        """Test accessing protected endpoints without token"""
        return self.run_test("Unauthorized Access", "GET", "events", 401)

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🎸 Starting VenuePass API Tests 🎸\n")
        
        # Basic tests
        self.test_root_endpoint()
        
        # Authentication tests
        self.test_admin_registration()
        self.test_staff_registration()
        self.test_invalid_login()
        self.test_unauthorized_access()
        
        # Event management tests (admin only)
        if self.admin_token:
            self.test_create_event()
            self.test_get_events()
            self.test_get_event_details()
            
            # Ticket management tests
            self.test_generate_tickets()
            self.test_scan_ticket_first_time()
            self.test_scan_ticket_second_time()
            self.test_scan_invalid_ticket()
            self.test_event_stats()
        
        # Permission tests
        if self.staff_token:
            self.test_staff_create_event_forbidden()
            self.test_staff_generate_tickets_forbidden()
            self.test_staff_event_stats_forbidden()
        
        # Print summary
        print(f"\n📊 Test Summary:")
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        return self.tests_passed, self.tests_run, self.test_results

def main():
    tester = VenuePassAPITester()
    passed, total, results = tester.run_all_tests()
    
    # Save detailed results
    with open('/app/backend_test_results.json', 'w') as f:
        json.dump({
            'summary': {
                'tests_run': total,
                'tests_passed': passed,
                'tests_failed': total - passed,
                'success_rate': (passed/total)*100 if total > 0 else 0
            },
            'results': results
        }, f, indent=2)
    
    return 0 if passed == total else 1

if __name__ == "__main__":
    sys.exit(main())