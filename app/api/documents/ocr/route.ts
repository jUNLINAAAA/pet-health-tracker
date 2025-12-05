import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  generateComprehensiveAlerts,
  Pet,
  HealthRecord,
  ComprehensiveAlertInput
} from '@/lib/unified-health-system';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * POST /api/documents/ocr
 * Process uploaded document with OCR and extract health data
 *
 * Body (multipart/form-data):
 * - file: The uploaded file (PDF or image)
 * - userId: User ID
 * - petId: Pet ID
 * - documentType?: Optional document type hint
 */
export async function POST(request: NextRequest) {
  let supabase = null as ReturnType<typeof createClient> | null;
  let docRecordId: string | null = null;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;
    const petId = formData.get('petId') as string;
    const documentTypeHint = formData.get('documentType') as string | null;

    if (!file || !userId || !petId) {
      return NextResponse.json(
        { error: 'file, userId, and petId are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500, headers: corsHeaders }
      );
    }

    supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (!anthropicKey && !openaiKey) {
      return NextResponse.json(
        { error: 'AI OCR provider not configured' },
        { status: 503, headers: corsHeaders }
      );
    }

    // Get pet info for context
    const { data: pet } = await supabase
      .from('pets')
      .select('name, species, breed, age, weight')
      .eq('id', petId)
      .single();

    if (!pet) {
      return NextResponse.json(
        { error: 'Pet not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Convert file to base64 for vision API
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Data = buffer.toString('base64');

    // Determine media type
    const fileType = file.type;
    const isImage = fileType.startsWith('image/');
    const isPdf = fileType === 'application/pdf';

    if (!isImage && !isPdf) {
      return NextResponse.json(
        { error: 'File must be an image (PNG, JPG, WEBP) or PDF' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Upload to Supabase storage first
    const storagePath = `${userId}/${petId}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('health-documents')
      .upload(storagePath, buffer, {
        contentType: fileType,
        cacheControl: '3600',
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      // Continue with OCR even if storage fails
    }

    // Create document record in pending state
    const { data: docRecord, error: docError } = await supabase
      .from('health_documents')
      .insert({
        user_id: userId,
        pet_id: petId,
        file_name: file.name,
        file_type: isPdf ? 'pdf' : 'image',
        file_size: file.size,
        storage_path: storagePath,
        processing_status: 'processing',
        document_type: documentTypeHint || null,
      })
      .select()
      .single();

    docRecordId = docRecord?.id ?? null;

    if (docError) {
      console.error('Document record error:', docError);
    }

    // Build prompt for OCR extraction
    const extractionPrompt = `You are a veterinary document analysis expert. Analyze this ${isPdf ? 'PDF document' : 'image'} which appears to be a pet health document for ${pet.name} (${pet.species}, ${pet.breed || 'mixed breed'}, ${pet.age || 'unknown'} years old, ${pet.weight || 'unknown'}kg).

TASK: Extract all health-related information from this document and return it as structured JSON.

IMPORTANT: Look for and extract:
1. **Vaccinations**: vaccine name, date administered, next due date, veterinarian/clinic
2. **Weight records**: weight value, unit (kg/lbs), date recorded
3. **Lab results**: test type, values, units, reference ranges, date
4. **Medications**: drug name, dosage, frequency, duration, prescribing vet
5. **Vital signs**: temperature, heart rate, respiratory rate
6. **Diagnoses**: conditions identified, severity, date
7. **Visit notes**: reason for visit, findings, recommendations
8. **Document metadata**: clinic name, vet name, date of document

Return JSON in this exact format:
{
  "documentType": "vaccination_record" | "lab_results" | "prescription" | "vet_visit" | "xray" | "other",
  "documentDate": "YYYY-MM-DD or null if unknown",
  "clinicName": "string or null",
  "veterinarian": "string or null",
  "extractedText": "Full text content of the document",
  "healthRecords": [
    {
      "type": "weight" | "temperature" | "heart_rate" | "vaccination" | "lab_result" | "medication" | "diagnosis" | "activity",
      "value": number or null,
      "unit": "string",
      "notes": "additional details",
      "recordedAt": "YYYY-MM-DD or null"
    }
  ],
  "vaccinations": [
    {
      "name": "vaccine name",
      "dateAdministered": "YYYY-MM-DD",
      "nextDueDate": "YYYY-MM-DD or null",
      "batchNumber": "string or null"
    }
  ],
  "medications": [
    {
      "name": "drug name",
      "dosage": "string",
      "frequency": "string",
      "duration": "string or null",
      "startDate": "YYYY-MM-DD or null"
    }
  ],
  "labResults": [
    {
      "testName": "string",
      "value": "string",
      "unit": "string",
      "referenceRange": "string or null",
      "status": "normal" | "low" | "high" | "critical" | null
    }
  ],
  "diagnoses": [
    {
      "condition": "string",
      "severity": "low" | "medium" | "high",
      "notes": "string or null"
    }
  ],
  "recommendations": ["array of recommendation strings"],
  "alerts": [
    {
      "type": "string",
      "severity": "low" | "medium" | "high",
      "message": "string"
    }
  ],
  "confidence": 0.0 to 1.0
}

If you cannot extract certain fields, set them to null. Be thorough but accurate - only include data you can clearly read from the document.`;

    let extractedData: any = null;
    let aiProvider = 'none';

    // Try Anthropic Claude first (best for vision)
    if (anthropicKey && isImage) {
      try {
        console.log('Trying Anthropic Claude for OCR...');
        const mediaType = fileType === 'image/jpeg' ? 'image/jpeg' :
                         fileType === 'image/png' ? 'image/png' :
                         fileType === 'image/webp' ? 'image/webp' : 'image/png';

        const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': anthropicKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4096,
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'image',
                    source: {
                      type: 'base64',
                      media_type: mediaType,
                      data: base64Data,
                    },
                  },
                  {
                    type: 'text',
                    text: extractionPrompt,
                  },
                ],
              },
            ],
          }),
        });

        if (anthropicResponse.ok) {
          const anthropicData = await anthropicResponse.json();
          const content = anthropicData.content?.[0]?.text;
          if (content) {
            // Extract JSON from response
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              extractedData = JSON.parse(jsonMatch[0]);
              aiProvider = 'Anthropic Claude';
              console.log('OCR success with Anthropic Claude');
            }
          }
        } else {
          const errorText = await anthropicResponse.text();
          console.warn('Anthropic API failed:', errorText);
        }
      } catch (anthropicError) {
        console.warn('Anthropic API error:', anthropicError);
      }
    }

    // Fallback to OpenAI GPT-4 Vision
    if (!extractedData && openaiKey && isImage) {
      try {
        console.log('Trying OpenAI GPT-4 Vision for OCR...');
        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            max_tokens: 4096,
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: extractionPrompt,
                  },
                  {
                    type: 'image_url',
                    image_url: {
                      url: `data:${fileType};base64,${base64Data}`,
                    },
                  },
                ],
              },
            ],
          }),
        });

        if (openaiResponse.ok) {
          const openaiData = await openaiResponse.json();
          const content = openaiData.choices?.[0]?.message?.content;
          if (content) {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              extractedData = JSON.parse(jsonMatch[0]);
              aiProvider = 'OpenAI GPT-4 Vision';
              console.log('OCR success with OpenAI GPT-4 Vision');
            }
          }
        } else {
          const errorText = await openaiResponse.text();
          console.warn('OpenAI API failed:', errorText);
        }
      } catch (openaiError) {
        console.warn('OpenAI API error:', openaiError);
      }
    }

    // If no vision API available or all failed
    if (!extractedData) {
      // Update document status to failed
      if (docRecord) {
        await supabase
          .from('health_documents')
          .update({
            processing_status: 'failed',
            processing_error: 'No AI vision service available for OCR',
          })
          .eq('id', docRecord.id);
      }

      return NextResponse.json(
        {
          error: 'OCR service unavailable. Please configure ANTHROPIC_API_KEY or OPENAI_API_KEY.',
          documentId: docRecord?.id,
        },
        { status: 503, headers: corsHeaders }
      );
    }

    // Create health records from extracted data
    const createdRecords: any[] = [];

    // Process vaccinations
    if (extractedData.vaccinations?.length) {
      for (const vax of extractedData.vaccinations) {
        const { data: record, error } = await supabase
          .from('health_records')
          .insert({
            pet_id: petId,
            user_id: userId,
            type: 'vaccination',
            value: 1,
            unit: 'dose',
            notes: `${vax.name}${vax.batchNumber ? ` (Batch: ${vax.batchNumber})` : ''}${vax.nextDueDate ? `. Next due: ${vax.nextDueDate}` : ''}`,
            recorded_at: vax.dateAdministered ? new Date(vax.dateAdministered).toISOString() : new Date().toISOString(),
          })
          .select()
          .single();

        if (record) {
          createdRecords.push(record);
        }
      }
    }

    // Process health records (weight, temp, etc.)
    if (extractedData.healthRecords?.length) {
      for (const hr of extractedData.healthRecords) {
        if (hr.type === 'weight' && hr.value) {
          // Also update pet's current weight
          await supabase
            .from('pets')
            .update({ weight: hr.value })
            .eq('id', petId);
        }

        const { data: record, error } = await supabase
          .from('health_records')
          .insert({
            pet_id: petId,
            user_id: userId,
            type: hr.type,
            value: hr.value || 0,
            unit: hr.unit || '',
            notes: hr.notes || null,
            recorded_at: hr.recordedAt ? new Date(hr.recordedAt).toISOString() : new Date().toISOString(),
          })
          .select()
          .single();

        if (record) {
          createdRecords.push(record);
        }
      }
    }

    // Process lab results as health records
    if (extractedData.labResults?.length) {
      for (const lab of extractedData.labResults) {
        // Determine if this is a critical/abnormal result
        const isAbnormal = lab.status === 'high' || lab.status === 'low' || lab.status === 'critical';

        const { data: record, error } = await supabase
          .from('health_records')
          .insert({
            pet_id: petId,
            user_id: userId,
            type: 'lab_result',
            value: parseFloat(lab.value) || 0,
            unit: lab.unit || '',
            notes: `${lab.testName}: ${lab.value} ${lab.unit}${lab.referenceRange ? ` (Ref: ${lab.referenceRange})` : ''}${lab.status ? ` - ${lab.status.toUpperCase()}` : ''}`,
            recorded_at: extractedData.documentDate ? new Date(extractedData.documentDate).toISOString() : new Date().toISOString(),
          })
          .select()
          .single();

        if (record) {
          createdRecords.push(record);
        }

        // Create alert for abnormal lab results
        if (isAbnormal) {
          await supabase.from('alerts').insert({
            pet_id: petId,
            user_id: userId,
            type: 'abnormal_lab_result',
            severity: lab.status === 'critical' ? 'high' : 'medium',
            message: `Abnormal ${lab.testName}: ${lab.value} ${lab.unit} (${lab.status?.toUpperCase()})`,
            recommendation: `Consult with your veterinarian about the ${lab.status} ${lab.testName} result.`,
            resolved: false,
          });
        }
      }
    }

    // Process medications as health records
    if (extractedData.medications?.length) {
      for (const med of extractedData.medications) {
        const { data: record, error } = await supabase
          .from('health_records')
          .insert({
            pet_id: petId,
            user_id: userId,
            type: 'medication',
            value: 1, // 1 = active prescription
            unit: 'prescription',
            notes: `${med.name} - ${med.dosage}, ${med.frequency}${med.duration ? ` for ${med.duration}` : ''}`,
            recorded_at: med.startDate ? new Date(med.startDate).toISOString() : new Date().toISOString(),
          })
          .select()
          .single();

        if (record) {
          createdRecords.push(record);
        }
      }
    }

    // Process diagnoses as health records
    if (extractedData.diagnoses?.length) {
      for (const diagnosis of extractedData.diagnoses) {
        const { data: record, error } = await supabase
          .from('health_records')
          .insert({
            pet_id: petId,
            user_id: userId,
            type: 'diagnosis',
            value: diagnosis.severity === 'high' ? 3 : diagnosis.severity === 'medium' ? 2 : 1, // Severity level
            unit: 'condition',
            notes: `${diagnosis.condition}${diagnosis.notes ? `: ${diagnosis.notes}` : ''}`,
            recorded_at: extractedData.documentDate ? new Date(extractedData.documentDate).toISOString() : new Date().toISOString(),
          })
          .select()
          .single();

        if (record) {
          createdRecords.push(record);
        }

        // Create alert for diagnoses
        await supabase.from('alerts').insert({
          pet_id: petId,
          user_id: userId,
          type: 'diagnosis',
          severity: diagnosis.severity || 'medium',
          message: `Diagnosed with: ${diagnosis.condition}`,
          recommendation: diagnosis.notes || 'Follow up with your veterinarian as recommended.',
          resolved: false,
        });
      }
    }

    // Create alerts for any additional issues detected by AI
    if (extractedData.alerts?.length) {
      for (const alert of extractedData.alerts) {
        await supabase
          .from('alerts')
          .insert({
            pet_id: petId,
            user_id: userId,
            type: alert.type || 'document_finding',
            severity: alert.severity || 'medium',
            message: alert.message,
            recommendation: 'Review document for details',
            resolved: false,
          });
      }
    }

    // --- COMPREHENSIVE ALERT GENERATION ---
    // After creating health records, run comprehensive alert generation
    // This ensures we catch weight/activity/vaccination issues from all data

    // Get all health records for this pet to analyze
    const { data: allRecords } = await supabase
      .from('health_records')
      .select('*')
      .eq('pet_id', petId)
      .eq('user_id', userId)
      .order('recorded_at', { ascending: false });

    // Map to HealthRecord type
    const healthRecordsForAnalysis: HealthRecord[] = (allRecords || []).map((r: any) => ({
      id: r.id,
      petId: r.pet_id,
      type: r.type,
      value: typeof r.value === 'string' ? parseFloat(r.value) : r.value,
      unit: r.unit || '',
      notes: r.notes,
      recordedAt: r.recorded_at,
      createdAt: r.created_at,
    }));

    // Get last vaccination date
    const vaccRecords = healthRecordsForAnalysis.filter(r => r.type === 'vaccination');
    const lastVaccinationDate = vaccRecords.length > 0
      ? new Date(vaccRecords[0].recordedAt)
      : undefined;

    // Get activity minutes this week
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const activityRecords = healthRecordsForAnalysis.filter(
      r => (r.type === 'activity' || r.type === 'exercise') && new Date(r.recordedAt) > oneWeekAgo
    );
    const activityMinutesThisWeek = activityRecords.reduce((sum, r) => sum + r.value, 0);

    // Re-fetch updated pet info (weight may have changed)
    const { data: updatedPet } = await supabase
      .from('pets')
      .select('*')
      .eq('id', petId)
      .single();

    if (updatedPet) {
      // Convert to Pet type for alert generation
      const petForAlerts: Pet = {
        id: updatedPet.id,
        name: updatedPet.name,
        species: updatedPet.species,
        breed: updatedPet.breed || undefined,
        age: updatedPet.age ? parseFloat(updatedPet.age) : undefined,
        weight: updatedPet.weight ? parseFloat(updatedPet.weight) : undefined,
      };

      // Generate comprehensive alerts using rule-based system
      const comprehensiveAlerts = generateComprehensiveAlerts({
        pet: petForAlerts,
        healthRecords: healthRecordsForAnalysis,
        lastVaccinationDate,
        activityMinutesThisWeek: activityMinutesThisWeek > 0 ? activityMinutesThisWeek : undefined,
      });

      // Clear existing unresolved alerts of the same types to avoid duplicates
      const newAlertTypes = comprehensiveAlerts.map(a => a.type);
      if (newAlertTypes.length > 0) {
        await supabase
          .from('alerts')
          .update({ resolved: true, resolved_at: new Date().toISOString() })
          .eq('pet_id', petId)
          .eq('user_id', userId)
          .eq('resolved', false)
          .in('type', newAlertTypes);
      }

      // Insert new comprehensive alerts
      let comprehensiveAlertsCreated = 0;
      for (const alert of comprehensiveAlerts) {
        const { error: alertError } = await supabase.from('alerts').insert({
          pet_id: petId,
          user_id: userId,
          type: alert.type,
          severity: alert.severity,
          message: alert.message,
          recommendation: alert.recommendation,
          resolved: false,
        });

        if (!alertError) {
          comprehensiveAlertsCreated++;
        }
      }

      console.log(`Generated ${comprehensiveAlertsCreated} comprehensive alerts based on all data`);
    }

    // Update document record with extracted data
    if (docRecord) {
      await supabase
        .from('health_documents')
        .update({
          processing_status: 'completed',
          extracted_text: extractedData.extractedText || null,
          extracted_data: extractedData,
          document_type: extractedData.documentType || documentTypeHint,
          document_date: extractedData.documentDate || null,
          health_records_created: createdRecords.map(r => r.id),
        })
        .eq('id', docRecord.id);
    }

    console.log(`OCR completed: ${createdRecords.length} health records created using ${aiProvider}`);

    return NextResponse.json({
      success: true,
      documentId: docRecord?.id,
      aiProvider,
      extractedData: {
        documentType: extractedData.documentType,
        documentDate: extractedData.documentDate,
        clinicName: extractedData.clinicName,
        veterinarian: extractedData.veterinarian,
        confidence: extractedData.confidence,
        recordsFound: {
          vaccinations: extractedData.vaccinations?.length || 0,
          healthRecords: extractedData.healthRecords?.length || 0,
          labResults: extractedData.labResults?.length || 0,
          medications: extractedData.medications?.length || 0,
          diagnoses: extractedData.diagnoses?.length || 0,
        },
        recommendations: extractedData.recommendations || [],
        alerts: extractedData.alerts || [],
      },
      healthRecordsCreated: createdRecords.length,
      records: createdRecords,
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('OCR API error:', error);

    if (supabase && docRecordId) {
      try {
        await supabase
          .from('health_documents')
          .update({
            processing_status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
          })
          .eq('id', docRecordId);
      } catch (updateError) {
        console.error('Failed to mark document as failed:', updateError);
      }
    }

    return NextResponse.json(
      { error: 'Internal server error during document processing' },
      { status: 500, headers: corsHeaders }
    );
  }
}
