<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Packing List - {{ $invoice->invoice_number }}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: Arial, sans-serif;
            font-size: 11px;
            line-height: 1.4;
            color: #000;
            padding: 20px;
        }

        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #000;
            padding-bottom: 15px;
        }

        .header .company-name {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 5px;
        }

        .header .company-details {
            font-size: 10px;
            color: #333;
            margin-bottom: 3px;
        }

        .header .title {
            font-size: 20px;
            font-weight: bold;
            margin-top: 15px;
            text-decoration: underline;
        }

        .info-section {
            margin-bottom: 25px;
        }

        .info-row {
            display: flex;
            margin-bottom: 8px;
        }

        .info-label {
            font-weight: bold;
            width: 150px;
            display: inline-block;
        }

        .info-value {
            flex: 1;
        }

        .addresses {
            display: flex;
            justify-content: space-between;
            margin-bottom: 25px;
            gap: 20px;
        }

        .address-box {
            flex: 1;
            border: 1px solid #000;
            padding: 12px;
        }

        .address-box h3 {
            font-size: 12px;
            font-weight: bold;
            margin-bottom: 8px;
            border-bottom: 1px solid #000;
            padding-bottom: 4px;
        }

        .address-line {
            margin-bottom: 3px;
            font-size: 10px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }

        .packing-table th {
            background-color: #333;
            color: white;
            padding: 10px 8px;
            text-align: left;
            font-size: 10px;
            font-weight: bold;
            border: 1px solid #000;
        }

        .packing-table td {
            border: 1px solid #333;
            padding: 8px;
            font-size: 10px;
        }

        .packing-table tr:nth-child(even) {
            background-color: #f5f5f5;
        }

        .packing-table .text-center {
            text-align: center;
        }

        .packing-table .text-right {
            text-align: right;
        }

        .totals-row {
            background-color: #e6e6e6;
            font-weight: bold;
        }

        .totals-row td {
            border: 2px solid #000;
            padding: 12px 8px;
            font-size: 11px;
        }

        .summary {
            margin-top: 20px;
            padding: 15px;
            background-color: #f9f9f9;
            border: 2px solid #333;
        }

        .summary-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 12px;
        }

        .summary-label {
            font-weight: bold;
        }

        .summary-value {
            font-weight: bold;
            color: #000;
        }

        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #333;
        }

        .signature-section {
            display: flex;
            justify-content: space-between;
            margin-top: 50px;
        }

        .signature-box {
            flex: 1;
            text-align: center;
        }

        .signature-line {
            border-top: 2px solid #000;
            margin-bottom: 8px;
            padding-top: 8px;
            font-weight: bold;
        }

        .signature-label {
            font-size: 10px;
            color: #666;
        }

        .notes {
            margin-top: 20px;
            font-size: 9px;
            color: #666;
            font-style: italic;
        }
    </style>
</head>
<body>
    <!-- Header -->
    <div class="header">
        <div class="company-name">{{ $invoice->supplier->name ?? 'ALTECRETE CC' }}</div>
        <div class="company-details">{{ $invoice->supplier->address ?? 'P.O. Box 26340, Monument Park, 0105' }}</div>
        <div class="company-details">Tel: {{ $invoice->supplier->phone ?? '+27 12 001 0000' }} | Email: {{ $invoice->supplier->email ?? 'info@altecrete.co.za' }}</div>
        <div class="company-details">Reg No: {{ $invoice->supplier->registration_number ?? '327017' }} | VAT No: {{ $invoice->supplier->vat_number ?? '4370245479' }}</div>
        <div class="title">PACKING LIST</div>
    </div>

    <!-- Invoice Information -->
    <div class="info-section">
        <div class="info-row">
            <span class="info-label">Invoice Number:</span>
            <span class="info-value">{{ $invoice->invoice_number }}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Invoice Date:</span>
            <span class="info-value">{{ $invoice->invoice_date ? \Carbon\Carbon::parse($invoice->invoice_date)->format('d F Y') : '-' }}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Customer Reference:</span>
            <span class="info-value">{{ $invoice->customer_reference ?? $invoice->purchase_order ?? '-' }}</span>
        </div>
        @if($invoice->end_user)
        <div class="info-row">
            <span class="info-label">End User:</span>
            <span class="info-value">{{ $invoice->end_user }}</span>
        </div>
        @endif
        <div class="info-row">
            <span class="info-label">Generated Date:</span>
            <span class="info-value">{{ $generatedDate }}</span>
        </div>
    </div>

    <!-- Customer and Delivery Addresses -->
    <div class="addresses">
        <div class="address-box">
            <h3>CUSTOMER</h3>
            <div class="address-line"><strong>{{ $invoice->customer->name ?? 'N/A' }}</strong></div>
            @if($invoice->customer && $invoice->customer->address)
                @foreach(explode("\n", $invoice->customer->address) as $line)
                    <div class="address-line">{{ $line }}</div>
                @endforeach
            @endif
            @if($invoice->customer && $invoice->customer->phone)
                <div class="address-line">Tel: {{ $invoice->customer->phone }}</div>
            @endif
        </div>

        <div class="address-box">
            <h3>DELIVERY ADDRESS</h3>
            @if($invoice->delivery_address)
                @foreach(explode("\n", $invoice->delivery_address) as $line)
                    <div class="address-line">{{ $line }}</div>
                @endforeach
            @else
                <div class="address-line">{{ $invoice->customer->address ?? 'N/A' }}</div>
            @endif
        </div>
    </div>

    <!-- Packing Details Table -->
    <table class="packing-table">
        <thead>
            <tr>
                <th style="width: 8%;" class="text-center">Package #</th>
                <th style="width: 15%;">Package Type</th>
                <th style="width: 37%;">Description</th>
                <th style="width: 10%;" class="text-center">Quantity</th>
                <th style="width: 10%;" class="text-right">Unit Weight (kg)</th>
                <th style="width: 10%;" class="text-right">Gross Weight (kg)</th>
                <th style="width: 10%;" class="text-right">Net Weight (kg)</th>
            </tr>
        </thead>
        <tbody>
            @foreach($packingDetails as $detail)
            <tr>
                <td class="text-center">{{ $detail->package_number }}</td>
                <td>{{ $detail->package_type ?? 'PALLET' }}</td>
                <td>{{ $detail->contents_description }}</td>
                <td class="text-center">
                    @if($detail->extracted_data && isset($detail->extracted_data['quantity']))
                        {{ $detail->extracted_data['quantity'] }}
                    @else
                        1
                    @endif
                </td>
                <td class="text-right">
                    @if($detail->extracted_data && isset($detail->extracted_data['weight_per_unit_kg']))
                        {{ number_format($detail->extracted_data['weight_per_unit_kg'], 2) }}
                    @else
                        {{ number_format($detail->gross_weight_kg, 2) }}
                    @endif
                </td>
                <td class="text-right">{{ number_format($detail->gross_weight_kg, 2) }}</td>
                <td class="text-right">{{ number_format($detail->net_weight_kg, 2) }}</td>
            </tr>
            @endforeach

            <!-- Totals Row -->
            <tr class="totals-row">
                <td colspan="3" class="text-right"><strong>TOTALS:</strong></td>
                <td class="text-center"><strong>{{ $totalPackages }}</strong></td>
                <td></td>
                <td class="text-right"><strong>{{ number_format($totalGrossWeight, 2) }} kg</strong></td>
                <td class="text-right"><strong>{{ number_format($totalNetWeight, 2) }} kg</strong></td>
            </tr>
        </tbody>
    </table>

    <!-- Summary -->
    <div class="summary">
        <div class="summary-row">
            <span class="summary-label">Total Number of Packages:</span>
            <span class="summary-value">{{ $totalPackages }}</span>
        </div>
        <div class="summary-row">
            <span class="summary-label">Total Gross Weight:</span>
            <span class="summary-value">{{ number_format($totalGrossWeight, 2) }} kg</span>
        </div>
        <div class="summary-row">
            <span class="summary-label">Total Net Weight:</span>
            <span class="summary-value">{{ number_format($totalNetWeight, 2) }} kg</span>
        </div>
    </div>

    <!-- Footer with Signatures -->
    <div class="footer">
        <div class="signature-section">
            <div class="signature-box">
                <div class="signature-line">
                    _________________________________
                </div>
                <div class="signature-label">Prepared By</div>
            </div>
            <div class="signature-box">
                <div class="signature-line">
                    _________________________________
                </div>
                <div class="signature-label">Driver Name & Signature</div>
            </div>
            <div class="signature-box">
                <div class="signature-line">
                    _________________________________
                </div>
                <div class="signature-label">Date</div>
            </div>
        </div>

        <div class="notes">
            This packing list was generated manually for {{ $invoice->invoice_number }}.
            All information should be verified against actual shipment contents.
        </div>
    </div>
</body>
</html>
