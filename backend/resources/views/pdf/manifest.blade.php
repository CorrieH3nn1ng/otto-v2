<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Manifest {{ $manifest->manifest_number }}</title>
    <style>
        @page {
            size: A4 landscape;
            margin: 15px;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: Arial, sans-serif;
            font-size: 10px;
            line-height: 1.2;
            color: #000;
            position: relative;
            height: 100%;
            text-transform: uppercase;
        }

        .top-bar {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 10px;
            min-height: 80px;
        }

        .logo-section {
            flex: 0 0 150px;
        }

        .version-text {
            font-size: 8px;
            color: #666;
            margin-top: 5px;
        }

        .qr-section {
            flex: 0 0 80px;
            text-align: right;
            display: flex;
            justify-content: flex-end;
            align-items: flex-start;
        }

        .qr-section img {
            max-width: 80px;
            max-height: 80px;
        }

        .header-bar {
            background-color: #3d2d6b;
            color: white;
            padding: 8px 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0;
            margin-left: 5px;
            margin-right: 5px;
        }

        .header-bar .title {
            font-size: 13px;
            font-weight: bold;
            flex: 1;
        }

        .header-bar .right-section {
            display: flex;
            gap: 15px;
            align-items: center;
            text-align: right;
        }

        .header-bar .date,
        .header-bar .page {
            font-size: 12px;
            font-weight: bold;
        }

        table {
            width: 100%;
            border-collapse: collapse;
        }

        .transport-table {
            margin-bottom: 10px;
            margin-left: 5px;
            margin-right: 5px;
            width: calc(100% - 10px);
        }

        .transport-table td {
            border: 1px solid #000;
            padding: 5px;
            text-align: center;
            vertical-align: middle;
            font-size: 9px;
        }

        .transport-table .label-cell {
            background-color: #000;
            color: white;
            font-weight: bold;
            padding: 4px;
        }

        .transport-table .value-cell {
            font-weight: bold;
            font-size: 10px;
        }

        .shipment-header {
            background-color: #3d2d6b;
            color: white;
            padding: 5px 10px;
            font-weight: bold;
            font-size: 10px;
            text-align: center;
            margin: 0 5px;
            display: block;
            box-sizing: border-box;
        }

        .shipment-table {
            margin-bottom: 10px;
            margin-left: 5px;
            margin-right: 5px;
            width: calc(100% - 10px);
        }

        .shipment-table td {
            border: 1px solid #000;
            padding: 8px;
            vertical-align: top;
            font-size: 10px;
        }

        .shipment-table .header-cell {
            background-color: #000;
            color: white;
            font-weight: bold;
            font-size: 9px;
            text-align: center;
            padding: 5px;
        }

        .details-column {
            width: 18%;
            font-size: 9px;
        }

        .detail-row {
            margin-bottom: 4px;
            line-height: 1.3;
        }

        .detail-label {
            color: #000;
            font-weight: normal;
        }

        .detail-value {
            font-weight: bold;
            color: #000;
        }

        .company-cell {
            font-size: 10px;
            line-height: 1.4;
        }

        .company-name {
            font-weight: bold;
            margin-bottom: 8px;
        }

        .instruction-box {
            background-color: #3d2d6b;
            color: white;
            padding: 15px 20px;
            margin-bottom: 8px;
            font-size: 10px;
            line-height: 1.5;
            margin-top: 5px;
            min-height: 50px;
        }

        .footer-container {
            position: absolute;
            bottom: 15px;
            left: 20px;
            right: 20px;
            width: calc(100% - 40px);
        }
    </style>
</head>
<body>
    {{-- Top section with logo and QR code --}}
    <div class="top-bar">
        <div class="logo-section">
            {{-- Logo image --}}
            <img src="{{ public_path('nucleusmlsmall_1.gif') }}" alt="Nucleus Mining Logistics" style="height: 60px; margin-bottom: 5px;">
            <div class="version-text">Completed by :H-L Manifest version :2</div>
        </div>
        <div class="qr-section">
            {{-- QR code SVG --}}
            {!! $qrCode !!}
        </div>
    </div>

    {{-- Header Bar --}}
    <div class="header-bar">
        <span class="title">Road freight manifest: {{ $manifest->manifest_number }}</span>
        <div class="right-section">
            <span class="date">{{ \Carbon\Carbon::parse($manifest->export_date)->format('Y-m-d') }}</span>
            <span class="page">PAGE 1 of 1</span>
        </div>
    </div>

    {{-- Transport & Clearing Table --}}
    <table class="transport-table">
        <tr>
            <td class="label-cell">TRANSPORTER</td>
            <td class="label-cell">CLEARING AGENT</td>
            <td class="label-cell">DESTINATION CLEARING AGENT</td>
            <td class="label-cell">PLACE OF OFFLOADING</td>
        </tr>
        <tr>
            <td class="value-cell">{{ strtoupper($loadConfirmation->transporter_name ?? 'N/A') }}</td>
            <td class="value-cell">{{ $loadConfirmation->clearing_agent ?? '-' }}</td>
            <td class="value-cell">{{ $loadConfirmation->entry_agent ?? '-' }}</td>
            <td class="value-cell">{{ strtoupper($manifest->border_post ?? $loadConfirmation->delivery_address ?? '-') }}</td>
        </tr>
        <tr>
            <td class="label-cell">MODE</td>
            <td class="label-cell">TRUCK TYPE</td>
            <td class="label-cell">BORDER</td>
            <td class="label-cell">REGISTRATION DETAILS</td>
        </tr>
        <tr>
            <td class="value-cell">ROAD</td>
            <td class="value-cell">{{ strtoupper($loadConfirmation->vehicle_type ?? 'N/A') }}</td>
            <td class="value-cell">{{ strtoupper($manifest->customs_office ?? '-') }}</td>
            <td class="value-cell">
                HORSE {{ $loadConfirmation->truck_registration ?? 'N/A' }}
                <span style="margin: 0 8px;">|</span>
                TRAILER {{ $loadConfirmation->trailer_1_registration ?? 'N/A' }}
                @if($loadConfirmation->trailer_2_registration)
                    <span style="margin: 0 8px;">|</span>
                    TRAILER {{ $loadConfirmation->trailer_2_registration }}
                @endif
            </td>
        </tr>
    </table>

    {{-- Shipment Details Header --}}
    <div class="shipment-header">SHIPMENT DETAILS</div>

    {{-- Shipment Details Table --}}
    @php
        $firstInvoice = $manifest->invoices->first();
        $totalPieces = 0;
        $totalWeight = 0;
        $totalCBM = 0;

        foreach($manifest->invoices as $invoice) {
            foreach($invoice->packingDetails as $detail) {
                $quantity = $detail->quantity ?? 1;
                $totalPieces += $quantity;
                $totalWeight += ($detail->gross_weight_kg ?? 0) * $quantity;
                $totalCBM += ($detail->cbm ?? 0) * $quantity;
            }
        }
    @endphp

    <table class="shipment-table">
        {{-- Header Row --}}
        <tr>
            <td class="header-cell" style="width: 18%;"></td>
            <td class="header-cell" style="width: 20%;">CONSIGNOR</td>
            <td class="header-cell" style="width: 20%;">CONSIGNEE</td>
            <td class="header-cell" style="width: 20%;">GOODS DESCRIPTION</td>
            <td class="header-cell" style="width: 22%;">DRC AGENT</td>
        </tr>

        {{-- Data Row --}}
        <tr>
            {{-- Left column: Details --}}
            <td class="details-column">
                <div class="detail-row">
                    <div class="detail-label">Pieces:</div>
                    <div class="detail-value">{{ $totalPieces }}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Weight:</div>
                    <div class="detail-value">{{ number_format($totalWeight, 1) }}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">CBM:</div>
                    <div class="detail-value">{{ number_format($totalCBM, 3) }}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Contract #:</div>
                    <div class="detail-value">{{ $manifest->contract_number ?? '' }}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Area and phase #:</div>
                    <div class="detail-value">{{ $manifest->area_and_phase ?? '' }}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Project code:</div>
                    <div class="detail-value">{{ $manifest->project_code ?? '' }}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">PO #:</div>
                    <div class="detail-value">{{ $firstInvoice->purchase_order ?? '' }}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Invoice #:</div>
                    <div class="detail-value">{{ $firstInvoice->invoice_number ?? '' }}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">COD #:</div>
                    <div class="detail-value">{{ $manifest->cod_number ?? '' }}</div>
                </div>
            </td>

            {{-- CONSIGNOR Value --}}
            <td class="company-cell">
                <div class="company-name">{{ strtoupper($firstInvoice->supplier->name ?? 'N/A') }}</div>
                <div>{{ strtoupper($firstInvoice->supplier->address ?? '') }}</div>
            </td>

            {{-- CONSIGNEE Value --}}
            <td class="company-cell">
                <div class="company-name">{{ strtoupper($firstInvoice->customer->name ?? 'N/A') }}</div>
                <div>{{ strtoupper($firstInvoice->customer->delivery_address ?? $firstInvoice->customer->address ?? '') }}</div>
            </td>

            {{-- GOODS DESCRIPTION Value --}}
            <td class="company-cell" style="text-align: center;">
                <strong>{{ strtoupper($loadConfirmation->commodity_description ?? 'BREAKERS') }}</strong>
            </td>

            {{-- DRC AGENT Value --}}
            <td class="company-cell" style="text-align: center;">
                <strong>{{ strtoupper($loadConfirmation->entry_agent ?? 'AGL') }}</strong>
            </td>
        </tr>
    </table>

    {{-- Driver Instructions Footer --}}
    @if($manifest->driver_instruction_1 || $manifest->driver_instruction_2 || $loadConfirmation->contact_for_nucleus_drc)
    <div class="footer-container">
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 0;">
            <tr>
                <td class="instruction-box" style="width: 50%; border: 1px solid #000; vertical-align: top;">
                    {{ strtoupper($manifest->driver_instruction_1 ?: 'ALL DRIVER TO STOP AT KAMOA LOGISTICS FOR LOGISTICS DEPARTMENT CONTROL, AND PLACE OF OFFLOADING GUIDANCE') }}
                </td>
                <td class="instruction-box" style="width: 50%; border: 1px solid #000; vertical-align: top;">
                    {{ strtoupper($manifest->driver_instruction_2 ?: $loadConfirmation->contact_for_nucleus_drc) }}
                </td>
            </tr>
        </table>
    </div>
    @endif
</body>
</html>
