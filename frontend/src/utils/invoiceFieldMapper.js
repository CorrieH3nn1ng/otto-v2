/**
 * Flexible field mapper for handling different invoice template formats
 * Tries multiple possible field names and returns the first non-empty value found
 */

// Helper function to get value from multiple possible field names
const getField = (obj, fieldNames) => {
  if (!obj) return null;

  for (const fieldName of fieldNames) {
    // Support nested fields with dot notation (e.g., 'dimensions.length_cm')
    const keys = fieldName.split('.');
    let value = obj;

    for (const key of keys) {
      value = value?.[key];
      if (value === undefined) break;
    }

    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }

  return null;
};

// Helper to extract incoterms from delivery method (e.g., "ROAD-CPT-CHAMDOR" -> "CPT")
const extractIncoterms = (deliveryMethod) => {
  if (!deliveryMethod) return null;

  const incotermsList = ['EXW', 'FCA', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP', 'FAS', 'FOB', 'CFR', 'CIF'];
  const upperMethod = deliveryMethod.toUpperCase();

  for (const incoterm of incotermsList) {
    if (upperMethod.includes(incoterm)) {
      return incoterm;
    }
  }

  return null;
};

// Header field mappings with multiple variations
const headerFieldMappings = {
  po_number: ['purchase_order', 'po_number', 'your_order_number', 'order_number', 'po', 'order_no'],
  payment_terms: ['payment_terms', 'terms', 'payment_conditions'],
  delivery_address: ['customer_address', 'delivery_to', 'ship_to', 'ship_to_address', 'delivery_address', 'consignee'],
  supplier_address: ['supplier_address', 'from_address', 'seller_address', 'vendor_address', 'collection_address'],
  supplier_contact: ['supplier_contact', 'supplier_tel', 'supplier_phone', 'seller_contact', 'vendor_contact', 'contact_number', 'tel', 'telephone', 'phone'],
  supplier_email: ['supplier_contact.email', 'supplier_email', 'email', 'seller_email', 'contact_email', 'vendor_email'],
  exporter_code: ['exporter_code', 'exporter_number', 'export_code', 'exporter_ref', 'seller_code', 'vendor_code', 'supplier_code', 'supplier_number', 'supplier_registration.reg_no'],
  delivery_method: ['delivery_method', 'shipping_method', 'transport_method'],
  incoterms: ['incoterms', 'incoterm', 'delivery_terms'],
  hs_code: ['hs_code', 'tariff_code', 'commodity_code'],
  country_of_origin: ['country_of_origin', 'origin', 'country', 'made_in'],
};

// Line item field mappings
const lineItemFieldMappings = {
  item_code: ['stock_code', 'item_code', 'product_code', 'part_number', 'sku', 'material_number'],
  description: ['description', 'item_description', 'product_description', 'item_name'],
  quantity: ['quantity', 'qty', 'amount', 'qty_ordered'],
  unit_of_measure: ['unit_of_measure', 'uom', 'unit', 'measure'],
  unit_price: ['unit_price', 'price', 'rate', 'price_per_unit'],
  line_total: ['nett_price', 'line_total', 'total', 'amount', 'net_amount', 'line_amount'],
};

// Packing detail field mappings
const packingFieldMappings = {
  pallet_number: ['pallet_number', 'package_number', 'pkg_no', 'carton_no', 'box_no'],
  length: ['dimensions.length_cm', 'length_cm', 'length', 'l'],
  width: ['dimensions.width_cm', 'width_cm', 'width', 'w'],
  height: ['dimensions.height_cm', 'height_cm', 'height', 'h'],
  weight: ['weight_kg', 'gross_weight_kg', 'weight', 'gross_weight'],
};

// Delivery note item field mappings
const deliveryNoteFieldMappings = {
  item_code: ['stock_code', 'item_code', 'product_code', 'part_number', 'material_number', 'matl_number'],
  description: ['description', 'item_description', 'product_description'],
  quantity: ['quantity', 'qty', 'qty_shipped', 'quantity_shipped'],
  serial_number: ['serial_number', 'serial', 'serial_no', 's_n'],
  batch_number: ['batch_number', 'batch', 'batch_no', 'lot_number'],
};

/**
 * Map invoice header fields from extracted data
 */
export const mapInvoiceHeader = (invoiceDoc, deliveryDoc) => {
  const data = invoiceDoc?.data || {};
  const deliveryData = deliveryDoc?.data || {};

  // Get delivery method and try to extract incoterms from it
  const deliveryMethod = getField(data, headerFieldMappings.delivery_method);
  const extractedIncoterms = extractIncoterms(deliveryMethod);
  const directIncoterms = getField(data, headerFieldMappings.incoterms);

  // For addresses and contacts, try to get them directly if they exist as objects
  // Otherwise fall back to getField which tries multiple field name variations
  const supplierAddress = data.supplier_address || getField(data, headerFieldMappings.supplier_address);
  const deliveryAddress = data.customer_address || data.delivery_to ||
                          getField(data, headerFieldMappings.delivery_address) ||
                          getField(deliveryData, headerFieldMappings.delivery_address);
  const supplierContact = data.supplier_contact || getField(data, headerFieldMappings.supplier_contact);

  return {
    po_number: getField(data, headerFieldMappings.po_number) || getField(deliveryData, headerFieldMappings.po_number),
    payment_terms: getField(data, headerFieldMappings.payment_terms),
    delivery_address: deliveryAddress,
    supplier_address: supplierAddress,
    supplier_contact: supplierContact,
    supplier_email: getField(data, headerFieldMappings.supplier_email),
    exporter_code: getField(data, headerFieldMappings.exporter_code),
    delivery_method: deliveryMethod,
    incoterms: directIncoterms || extractedIncoterms || '',
    hs_code: getField(data, headerFieldMappings.hs_code),
    country_of_origin: getField(data, headerFieldMappings.country_of_origin),
  };
};

/**
 * Map line items from invoice data
 */
export const mapLineItems = (invoiceDoc) => {
  const lineItems = invoiceDoc?.data?.line_items || [];
  const globalHsCode = getField(invoiceDoc?.data, headerFieldMappings.hs_code);
  const globalCountry = getField(invoiceDoc?.data, headerFieldMappings.country_of_origin);

  return lineItems.map((item, idx) => ({
    line_number: idx + 1,
    item_code: getField(item, lineItemFieldMappings.item_code) || '',
    description: getField(item, lineItemFieldMappings.description) || '',
    quantity: parseFloat(getField(item, lineItemFieldMappings.quantity)) || 0,
    unit_of_measure: getField(item, lineItemFieldMappings.unit_of_measure) || 'EA',
    unit_price: parseFloat(getField(item, lineItemFieldMappings.unit_price)) || 0,
    line_total: parseFloat(getField(item, lineItemFieldMappings.line_total)) || 0,
    hs_code: getField(item, headerFieldMappings.hs_code) || globalHsCode || '',
    country_of_origin: getField(item, headerFieldMappings.country_of_origin) || globalCountry || '',
    is_kit_item: false,
  }));
};

/**
 * Map packing details from packing list documents
 */
export const mapPackingDetails = (packingDocs) => {
  return packingDocs.map((doc, idx) => {
    const data = doc.data || {};

    const length = parseFloat(getField(data, packingFieldMappings.length)) || 0;
    const width = parseFloat(getField(data, packingFieldMappings.width)) || 0;
    const height = parseFloat(getField(data, packingFieldMappings.height)) || 0;

    const cbm = (length && width && height) ?
      ((length * width * height) / 1000000).toFixed(6) : 0;
    const volumetricWeight = cbm ?
      (parseFloat(cbm) * 167).toFixed(3) : 0;

    // Build contents description from contents array if available
    let contentsDescription = '';
    if (data.contents && Array.isArray(data.contents)) {
      contentsDescription = data.contents
        .map(c => {
          const qty = c.quantity || c.qty || '';
          const desc = c.description || c.item_description || c.line_item || '';
          return qty && desc ? `${qty} x ${desc}` : desc;
        })
        .filter(Boolean)
        .join(', ');
    }

    return {
      package_number: idx + 1,
      package_type: getField(data, packingFieldMappings.pallet_number) || `Package ${idx + 1}`,
      length_cm: length,
      width_cm: width,
      height_cm: height,
      cbm: cbm,
      gross_weight_kg: parseFloat(getField(data, packingFieldMappings.weight)) || 0,
      net_weight_kg: parseFloat(getField(data, packingFieldMappings.weight)) || 0,
      volumetric_weight_kg: volumetricWeight,
      contents_description: contentsDescription,
    };
  });
};

/**
 * Map delivery note items
 */
export const mapDeliveryNoteItems = (deliveryDoc) => {
  const items = deliveryDoc?.data?.items || [];

  return items.map((item, idx) => ({
    line_number: idx + 1,
    item_code: getField(item, deliveryNoteFieldMappings.item_code) || '',
    description: getField(item, deliveryNoteFieldMappings.description) || '',
    quantity_shipped: parseFloat(getField(item, deliveryNoteFieldMappings.quantity)) || 0,
    unit_of_measure: 'EA',
    serial_number: getField(item, deliveryNoteFieldMappings.serial_number) || '',
    batch_number: getField(item, deliveryNoteFieldMappings.batch_number) || '',
  }));
};

/**
 * Main function to prepare invoice data from classified documents
 */
export const prepareInvoiceFromClassifiedDocs = (doc) => {
  const classifiedDocs = typeof doc.classified_documents === 'string'
    ? JSON.parse(doc.classified_documents)
    : (doc.classified_documents || []);

  // Find documents by type
  const invoiceDoc = classifiedDocs.find(d =>
    d.document_type === 'invoice' ||
    d.document_type === 'tax_invoice' ||
    d.document_type === 'commercial_invoice'
  );
  const deliveryDoc = classifiedDocs.find(d => d.document_type === 'delivery_note');
  const packingDocs = classifiedDocs.filter(d => d.document_type === 'packing_list');

  // Map header fields
  const headerFields = mapInvoiceHeader(invoiceDoc, deliveryDoc);

  // Map child data
  const lineItems = mapLineItems(invoiceDoc);
  const packingDetails = mapPackingDetails(packingDocs);
  const deliveryNoteItems = mapDeliveryNoteItems(deliveryDoc);

  return {
    invoice_number: doc.invoice_number,
    invoice_date: invoiceDoc?.data?.invoice_date || doc.invoice_date || '',
    supplier_id: doc.supplier_name,
    customer_id: doc.customer_name,
    total_amount: doc.total_amount,
    currency: doc.currency,
    ...headerFields,
    line_items: lineItems,
    packing_details: packingDetails,
    delivery_note_items: deliveryNoteItems,
    // Include raw classified documents for the RAW button
    _rawData: classifiedDocs,
  };
};
