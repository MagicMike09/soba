const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

// Read .env.local file manually
let envData = {}
try {
  const envFile = fs.readFileSync('.env.local', 'utf8')
  envFile.split('\n').forEach(line => {
    const [key, value] = line.split('=')
    if (key && value) {
      envData[key.trim()] = value.trim()
    }
  })
} catch (error) {
  console.log('❌ Cannot read .env.local file')
}

const supabase = createClient(
  envData.NEXT_PUBLIC_SUPABASE_URL,
  envData.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function testAudioAPIs() {
  console.log('🔊 Test des APIs Audio OpenAI...\n')
  
  try {
    // Get API key from database
    const { data: aiData, error: aiError } = await supabase
      .from('ai_config')
      .select('llm_api_key')
      .single()
    
    if (aiError || !aiData.llm_api_key) {
      console.log('❌ Pas de clé API trouvée dans la base')
      return
    }
    
    const apiKey = aiData.llm_api_key
    console.log('✅ Clé API trouvée:', apiKey.substring(0, 10) + '...')
    
    // Test TTS API
    console.log('\n🔊 Test Text-to-Speech...')
    try {
      const ttsResponse = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'tts-1',
          input: 'Bonjour, ceci est un test de synthèse vocale.',
          voice: 'alloy',
          response_format: 'mp3'
        }),
      })
      
      if (ttsResponse.ok) {
        const audioBuffer = await ttsResponse.arrayBuffer()
        console.log('✅ TTS fonctionne - taille audio:', audioBuffer.byteLength, 'bytes')
      } else {
        const errorText = await ttsResponse.text()
        console.log('❌ TTS erreur:', ttsResponse.status, ttsResponse.statusText)
        console.log('Détails:', errorText)
      }
    } catch (ttsError) {
      console.log('❌ TTS exception:', ttsError.message)
    }
    
    // Test if microphone is available (basic check)
    console.log('\n🎤 Test disponibilité microphone...')
    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      console.log('✅ API MediaDevices disponible')
    } else {
      console.log('❌ API MediaDevices non disponible (normal en Node.js)')
    }
    
    // Test STT with a dummy request (won't work without actual audio file)
    console.log('\n📝 Test Speech-to-Text (structure)...')
    try {
      const formData = new FormData()
      formData.append('model', 'whisper-1')
      formData.append('language', 'fr')
      
      // This will fail but we can see if the endpoint is accessible
      const sttResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        body: formData,
      })
      
      // Expected to fail due to missing file, but we check the error type
      const errorText = await sttResponse.text()
      if (errorText.includes('file') || errorText.includes('audio')) {
        console.log('✅ STT endpoint accessible (erreur attendue: fichier manquant)')
      } else {
        console.log('❌ STT erreur inattendue:', sttResponse.status, errorText)
      }
    } catch (sttError) {
      console.log('❌ STT exception:', sttError.message)
    }
    
  } catch (error) {
    console.log('❌ Erreur générale:', error.message)
  }
}

testAudioAPIs()