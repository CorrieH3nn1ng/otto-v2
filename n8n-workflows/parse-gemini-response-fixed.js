// Parse Gemini response
const items = $input.all();
const results = [];

for (const item of items) {
  let responseText;

  // Handle Gemini LangChain node response format
  // Response is an array: [{ content: { parts: [{ text: "..." }] } }]
  if (Array.isArray(item.json) && item.json[0]?.content?.parts?.[0]) {
    responseText = item.json[0].content.parts[0].text;
  }
  // Handle if it's already unwrapped as object
  else if (item.json.content?.parts?.[0]) {
    responseText = item.json.content.parts[0].text;
  }
  // Handle raw Gemini API format (for reference, not used with LangChain node)
  else if (item.json.candidates?.[0]?.content?.parts?.[0]) {
    responseText = item.json.candidates[0].content.parts[0].text;
  }
  else {
    throw new Error('No response from Gemini. Received structure: ' + JSON.stringify(item.json).substring(0, 500));
  }

  let jsonText = responseText.trim();

  // Remove markdown code blocks if present
  if (jsonText.startsWith('```json')) {
    jsonText = jsonText.replace(/```json\n?/g, '').replace(/\n?```$/g, '');
  } else if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/```\n?/g, '').replace(/\n?```$/g, '');
  }

  let extractedData;
  try {
    extractedData = JSON.parse(jsonText);
  } catch (error) {
    // Try to find JSON in the text
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      extractedData = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error(`Failed to parse Gemini response as JSON: ${error.message}\n\nResponse: ${jsonText}`);
    }
  }

  // Extract invoice_number from the data
  const invoiceNumber = extractedData.invoice_number;

  // Remove invoice_number from extracted_data
  delete extractedData.invoice_number;

  results.push({
    json: {
      invoice_number: invoiceNumber,
      extracted_data: extractedData,
      raw_gemini_response: responseText,
      processed_at: new Date().toISOString()
    }
  });
}

return results;
