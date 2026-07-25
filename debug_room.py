#!/usr/bin/env python3
"""
debug_room.py — Inspect a room's DynamoDB data to diagnose access code issues.
"""
import boto3
import json
import sys
import os

# Get room ID from command line or env
room_id = sys.argv[1] if len(sys.argv) > 1 else os.environ.get('ROOM_ID', '')

if not room_id:
    print("Usage: python3 debug_room.py <room_id>")
    print("Or set ROOM_ID environment variable")
    sys.exit(1)

try:
    dynamodb = boto3.resource('dynamodb', region_name='ap-south-1')
    table = dynamodb.Table('prism-EventRoomsTable-AWSX9GQQL5KA')
    
    print(f"\n📍 Looking up room: {room_id}\n")
    
    response = table.get_item(Key={'PK': f'ROOM#{room_id}', 'SK': 'METADATA'})
    room = response.get('Item')
    
    if not room:
        print("❌ Room not found in DynamoDB")
        sys.exit(1)
    
    print("✅ Room found!")
    print(f"   Room Name: {room.get('roomName')}")
    print(f"   Host ID: {room.get('hostId')}")
    print(f"   Photo Count: {room.get('photoCount')}")
    print(f"   Allow Download: {room.get('allowDownload')}")
    
    # Check for access code fields
    has_plain_code = 'accessCode' in room
    has_hash = 'accessCodeHash' in room
    
    print(f"\n🔐 Access Code Fields:")
    print(f"   Plain Code (accessCode): {'✅ Present' if has_plain_code else '❌ Missing'}")
    print(f"   Hash (accessCodeHash):   {'✅ Present' if has_hash else '❌ Missing'}")
    
    if has_plain_code:
        print(f"\n   📌 Access Code: {room['accessCode']}")
    
    # Show expiry
    import time
    ttl = room.get('ttl', 0)
    now = int(time.time())
    if ttl > now:
        print(f"\n⏱️  Room expires in: {(ttl - now) // 3600} hours")
    else:
        print(f"\n⏱️  Room has EXPIRED")
    
    print("\n" + "="*50)
    print("Full Room Data:")
    print(json.dumps(room, indent=2, default=str))
    
except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)
