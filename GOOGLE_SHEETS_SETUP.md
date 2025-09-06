# Google Sheets API Setup Guide

This guide explains how to set up Google Sheets API authentication for the agentic system.

## Current Status
- **Demo Mode**: The tool currently works in demo mode with realistic sample data
- **Test Spreadsheet**: Uses spreadsheet ID `1-RBXjd6S7FP3p0c2DY2FYncVyWoa-H1L6DSw4e9Xkgs`
- **Real API Ready**: Code structure prepared for easy real API integration

## Setting Up Real Google Sheets API (Optional)

### 1. Enable Google Sheets API
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing project
3. Enable the Google Sheets API
4. Create credentials (OAuth 2.0 or Service Account)

### 2. Authentication Options

#### Option A: OAuth 2.0 (Interactive)
```bash
# Download credentials.json from Google Cloud Console
# Place in project root as credentials.json
```

#### Option B: Service Account (Automated)
```bash
# Download service account key as service-account.json
# Place in project root as service-account.json
```

### 3. Environment Setup
```bash
# Install required packages (already done)
pip install google-api-python-client google-auth google-auth-oauthlib

# Set environment variable (optional)
export GOOGLE_APPLICATION_CREDENTIALS="service-account.json"
```

### 4. Enable Real API Mode
Uncomment the authentication code in `tools.py` GoogleSheetsTool class:

```python
def _get_sheets_service(self):
    # Uncomment for real API usage:
    # creds = None
    # if os.path.exists('token.json'):
    #     creds = Credentials.from_authorized_user_file('token.json', self.scopes)
    # if not creds or not creds.valid:
    #     # Handle authentication...
    # service = build('sheets', 'v4', credentials=creds)
    # return service
    return None  # Demo mode
```

## Demo Mode Features
- **Realistic Responses**: Returns data that matches actual API structure
- **Project Context**: Sample data relevant to wedding planning project
- **Full Operations**: All CRUD operations work with sample data
- **Visual Feedback**: Tool highlighting and progress tracking work properly

## Test Spreadsheet
- **URL**: https://docs.google.com/spreadsheets/d/1-RBXjd6S7FP3p0c2DY2FYncVyWoa-H1L6DSw4e9Xkgs/edit
- **ID**: `1-RBXjd6S7FP3p0c2DY2FYncVyWoa-H1L6DSw4e9Xkgs`
- **Usage**: Automatically used when no spreadsheet_id is provided for read operations

## Agents Using Google Sheets
- **Vendor Agent**: Can create vendor comparison spreadsheets
- **Schedule Agent**: Can create timeline and task tracking sheets
- **Budget Agent**: Can create budget breakdown spreadsheets
- **Vision Agent**: Can create project overview and status tracking sheets
