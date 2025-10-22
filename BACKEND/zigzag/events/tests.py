# test_throttling.py
import requests
import time

BASE_URL = "http://127.0.0.1:8000"

def test_registration_throttling():
    print("Testing registration throttling...")
    
    for i in range(12):  # Try 12 times (10 should work, 2 should fail)
        response = requests.post(f"{BASE_URL}/api/register/", json={
            "username": f"testuser{i}",
            "password": "testpass1234!", 
            "password2": "testpass1234!"
        })
        print(response)
        print(f"Attempt {i+1}: Status {response.status_code}")
        if response.status_code == 429:
            print("✅ Throttling working! Got 429 after 10 attempts")
            break
        time.sleep(0.1)  # Small delay between requests

def test_login_throttling():
    print("\nTesting login throttling...")
    
    for i in range(12):  # Try 12 times
        response = requests.post(f"{BASE_URL}/api/token/", json={
            "username": f"testuser{i}",
            "password": "testpass1234!"
        })
        print(response)
        print(f"Attempt {i+1}: Status {response.status_code}")
        if response.status_code == 429:
            print("✅ Throttling working! Got 429 after 10 attempts")
            break
        time.sleep(0.1)

if __name__ == "__main__":
    #test_registration_throttling()
    #test_login_throttling()
    from django.core.management.utils import get_random_secret_key
    print(get_random_secret_key())
