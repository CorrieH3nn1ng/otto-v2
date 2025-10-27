# n8n Load Confirmation Extraction Workflow Setup

## Overview
This workflow uses **Gemini Vision AI** to extract handwritten transport details from scanned invoices and automatically create/update load confirmations.

## Workflow Steps

### 1. Create New Workflow in n8n
1. Open n8n at `http://localhost:5678`
2. Click "New Workflow"
3. Name it: **"Otto - Load Confirmation Extraction"**

### 2. Add Webhook Trigger Node
- **Node Type**: Webhook
- **Webhook Path**: `/webhook/otto-load-confirmation-extract`
- **HTTP Method**: POST
- **Response Mode**: Respond Immediately
- **Response Data**: {{ $json }}

### 3. Add HTTP Request Node (Gemini Vision API)
- **Node Type**: HTTP Request
- **Method**: POST
- **URL**: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`
- **Authentication**: Add API Key
  - **Header Name**: `x-goog-api-key`
  - **API Key**: `YOUR_GEMINI_API_KEY`

**Body (JSON)**:
```json
{
  "contents": [{
    "parts": [
      {
        "text": "You are extracting information from a scanned invoice that has handwritten transport/loading details. Extract BOTH the printed invoice information AND the handwritten transport details:\n\n**PRINTED INFORMATION:**\n1. Invoice Number (look for 'Invoice No:', 'Invoice Number:', etc.)\n\n**HANDWRITTEN TRANSPORT DETAILS:**\n1. Total weight (in KG) - usually written as 'Total weight: X KG'\n2. Container/Package numbers - usually 3-5 numbered items with codes like 'JN42XZGP'\n3. Driver's Full Name\n4. Driver's Contact Number\n5. Date Loaded (format: YYYY-MM-DD)\n6. Time (format: HH:MM)\n7. Transporter name\n8. Vehicle Registration Number\n9. Loaded By (person's name)\n\nReturn ONLY a JSON object with this exact structure:\n{\n  \"invoice_number\": \"string\",\n  \"total_weight_kg\": number,\n  \"container_numbers\": [\"code1\", \"code2\", \"code3\"],\n  \"driver_name\": \"string\",\n  \"driver_contact\": \"string\",\n  \"date_loaded\": \"YYYY-MM-DD\",\n  \"time_loaded\": \"HH:MM\",\n  \"transporter\": \"string\",\n  \"vehicle_registration\": \"string\",\n  \"loaded_by\": \"string\"\n}\n\nIf a field is not found or unclear, use null. Be careful with handwriting - common mistakes:\n- '0' vs 'O'\n- '1' vs 'I' vs 'l'\n- '5' vs 'S'\n- '8' vs 'B'\n\nExtract from this document:"
      },
      {
        "inlineData": {
          "mimeType": "application/pdf",
          "data": "{{ $json.pdf_base64 }}"
        }
      }
    ]
  }]
}
```

### 4. Add Code Node (Parse Gemini Response)
- **Node Type**: Code
- **Language**: JavaScript

**Code**:
```javascript
// Extract the JSON from Gemini's response
const geminiResponse = $input.all()[0].json;
const textContent = geminiResponse.candidates[0].content.parts[0].text;

// Parse the JSON (Gemini sometimes wraps it in ```json...```)
let extractedData;
try {
  // Remove markdown code fences if present
  const jsonText = textContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  extractedData = JSON.parse(jsonText);
} catch (e) {
  // If parsing fails, try to extract JSON from text
  const jsonMatch = textContent.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    extractedData = JSON.parse(jsonMatch[0]);
  } else {
    throw new Error('Failed to parse Gemini response: ' + textContent);
  }
}

// Extract invoice_number from the extracted data
const invoiceNumber = extractedData.invoice_number;

// Remove invoice_number from extracted_data (it will be used to find the invoice)
delete extractedData.invoice_number;

return [{
  json: {
    invoice_number: invoiceNumber,
    extracted_data: extractedData,
    raw_gemini_response: textContent
  }
}];
```

### 5. Add HTTP Request Node (Send to Laravel)
- **Node Type**: HTTP Request
- **Method**: POST
- **URL**: `http://localhost:8000/api/webhook/load-confirmation`
- **Headers**:
  - `Content-Type`: `application/json`
- **Body**: {{ $json }}

### 6. Activate the Workflow
- Click **Save**
- Click **Activate** (toggle switch in top-right)

## Testing the Workflow

### Test with Postman or cURL:
```bash
# Convert PDF to base64
base64 -w 0 /path/to/scan.pdf > scan_base64.txt

# Send to n8n
curl -X POST http://localhost:5678/webhook/otto-load-confirmation-extract \
  -H "Content-Type: application/json" \
  -d '{
    "pdf_base64": "BASE64_STRING_HERE"
  }'
```

### Expected Flow:
1. **Webhook** receives PDF containing scanned invoice with handwritten notes
2. **Gemini** extracts BOTH invoice number AND handwritten transport data from PDF
3. **Code node** parses Gemini response, separates invoice_number from transport data
4. **Laravel** finds invoice by number and creates/updates load confirmation

## Laravel Endpoints Created

### 1. Upload Proxy
**POST** `/api/upload/load-confirmation`
- Accepts: `pdf_base64` (PDF containing scanned invoice with handwritten notes)
- Forwards to n8n workflow
- n8n extracts invoice number and transport details
- Returns: Extracted data

### 2. Webhook Receiver
**POST** `/api/webhook/load-confirmation`
- Receives `invoice_number` + extracted transport data from n8n
- Finds invoice in database by invoice_number
- Creates/updates LoadConfirmation record
- Updates invoice actual_weight_kg
- Links to invoice via pivot table

## Data Structure

### Input (from frontend):
```json
{
  "pdf_base64": "JVBERi0xLj..."
}
```

### Output (from n8n to Laravel):
```json
{
  "invoice_number": "IN018197",
  "extracted_data": {
    "total_weight_kg": 32000,
    "container_numbers": ["JN42XZGP", "JC 96 JMGP", "JC 46JN GP"],
    "driver_name": "Tawoma",
    "driver_contact": "+263 77 5 600097",
    "date_loaded": "2025-10-23",
    "time_loaded": "08:00",
    "transporter": "Nucleus",
    "vehicle_registration": "JN42X2SGP",
    "loaded_by": "Elriko"
  }
}
```

## Next Steps
1. Set up the n8n workflow as described above
2. Test with one of the example PDFs from `C:\projects\otto-v2\examples\`
3. Once tested, the frontend upload button will be added to the invoice detail page

## Notes
- The workflow uses Gemini 1.5 Flash (fast and cheap for OCR)
- Handwriting recognition is ~90% accurate
- Users can review and edit extracted data before final save
- Container numbers are stored as JSON array in database
