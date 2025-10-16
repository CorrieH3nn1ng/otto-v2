<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background-color: #001f3f;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 5px 5px 0 0;
        }
        .content {
            background-color: #f8f8f8;
            padding: 30px;
            border: 1px solid #ddd;
            border-top: none;
        }
        .info-row {
            margin-bottom: 15px;
        }
        .label {
            font-weight: bold;
            color: #001f3f;
        }
        .value {
            color: #555;
        }
        .footer {
            background-color: #001f3f;
            color: white;
            padding: 15px;
            text-align: center;
            font-size: 12px;
            border-radius: 0 0 5px 5px;
        }
        .button {
            display: inline-block;
            background-color: #38b2ac;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
        }
        .equipment-list {
            list-style: none;
            padding: 0;
        }
        .equipment-list li:before {
            content: "✓ ";
            color: #38b2ac;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Vehicle Booking Confirmation</h1>
    </div>

    <div class="content">
        <p>Dear {{ $transporterName }},</p>

        <p>Please find attached the Load Confirmation for the following booking:</p>

        <div class="info-row">
            <span class="label">File Reference:</span>
            <span class="value">{{ $fileReference }}</span>
        </div>

        <div class="info-row">
            <span class="label">Collection Date:</span>
            <span class="value">{{ $collectionDate }}</span>
        </div>

        <div class="info-row">
            <span class="label">Vehicle Type:</span>
            <span class="value">{{ $vehicleType }}</span>
        </div>

        @if($loadConfirmation->collection_address)
        <div class="info-row">
            <span class="label">Collection Address:</span>
            <span class="value">{{ $loadConfirmation->collection_address }}</span>
        </div>
        @endif

        @if($loadConfirmation->delivery_address)
        <div class="info-row">
            <span class="label">Delivery Address:</span>
            <span class="value">{{ $loadConfirmation->delivery_address }}</span>
        </div>
        @endif

        @if($loadConfirmation->straps || $loadConfirmation->chains || $loadConfirmation->tarpaulin ||
            $loadConfirmation->corner_plates || $loadConfirmation->uprights || $loadConfirmation->rubber_protection)
        <div class="info-row">
            <span class="label">Required Equipment:</span>
            <ul class="equipment-list">
                @if($loadConfirmation->straps)<li>Straps</li>@endif
                @if($loadConfirmation->chains)<li>Chains</li>@endif
                @if($loadConfirmation->tarpaulin)<li>Tarpaulin</li>@endif
                @if($loadConfirmation->corner_plates)<li>Corner Plates</li>@endif
                @if($loadConfirmation->uprights)<li>Uprights</li>@endif
                @if($loadConfirmation->rubber_protection)<li>Rubber Protection</li>@endif
            </ul>
        </div>
        @endif

        <p style="margin-top: 30px;">Please review the attached PDF for complete details.</p>

        <p><strong>Important:</strong> The original POD must be delivered with the transport invoice.</p>
    </div>

    <div class="footer">
        <p>This is an automated message from the OTTO Transport Management System.</p>
        <p>&copy; {{ date('Y') }} OTTO. All rights reserved.</p>
    </div>
</body>
</html>
