'use client'

import React, { useState } from 'react'
import { AdvisorService } from '@/utils/advisorService'
import { Advisor, UserContext } from '@/types'

interface EmailDiagnosticProps {
  isOpen: boolean
  onClose: () => void
  userContext?: UserContext | null
}

const EmailDiagnostic: React.FC<EmailDiagnosticProps> = ({
  isOpen,
  onClose,
  userContext
}) => {
  const [advisorService] = useState(() => new AdvisorService())
  const [testEmail, setTestEmail] = useState('')
  const [testName, setTestName] = useState('')
  const [isTesting, setIsTesting] = useState(false)
  const [results, setResults] = useState<string[]>([])

  if (!isOpen) return null

  const addResult = (message: string) => {
    setResults(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`])
  }

  const testEmailConfiguration = async () => {
    setIsTesting(true)
    setResults([])
    
    try {
      addResult('🔍 Vérification de la configuration EmailJS...')
      
      // Vérifier la configuration
      const config = advisorService.getEmailStats()
      addResult(`📊 Configuration EmailJS:`)
      addResult(`   ✅ Service ID: ${config.serviceId}`)
      addResult(`   ${config.hasTemplate ? '✅' : '❌'} Template ID: ${config.hasTemplate ? 'Configuré' : 'Manquant'}`)
      addResult(`   ${config.hasPublicKey ? '✅' : '❌'} Public Key: ${config.hasPublicKey ? 'Configuré' : 'Manquant'}`)
      addResult(`   ${config.configured ? '✅' : '❌'} Configuration complète: ${config.configured ? 'OUI' : 'NON'}`)

      // Vérifier les variables d'environnement
      addResult('\n🔧 Variables d\'environnement:')
      addResult(`   NEXT_PUBLIC_EMAILJS_SERVICE_ID: ${process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID ? '✅ Définie' : '❌ Manquante'}`)
      addResult(`   NEXT_PUBLIC_EMAILJS_TEMPLATE_ID: ${process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID ? '✅ Définie' : '❌ Manquante'}`)
      addResult(`   NEXT_PUBLIC_EMAILJS_PUBLIC_KEY: ${process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY ? '✅ Définie' : '❌ Manquante'}`)

      if (!config.configured) {
        addResult('\n❌ PROBLÈME: Configuration EmailJS incomplète!')
        addResult('📝 Actions requises:')
        addResult('   1. Créer un compte sur https://www.emailjs.com/')
        addResult('   2. Créer un service email (Gmail, Outlook, etc.)')
        addResult('   3. Créer un template d\'email')
        addResult('   4. Ajouter les variables d\'environnement dans .env.local')
        setIsTesting(false)
        return
      }

      // Test d'envoi si email fourni
      if (testEmail && testName) {
        addResult('\n📧 Test d\'envoi d\'email...')
        
        const testAdvisor: Advisor = {
          id: 'test-advisor',
          name: testName,
          firstName: testName.split(' ')[0] || testName,
          lastName: testName.split(' ')[1] || '',
          email: testEmail,
          phone: '+33 1 23 45 67 89',
          position: 'Conseiller Test',
          isAvailable: true
        }

        const emailSent = await advisorService.sendEmailToAdvisor(
          testAdvisor,
          userContext || null,
          'Test automatique depuis l\'interface de diagnostic'
        )

        if (emailSent) {
          addResult('✅ Email envoyé avec succès!')
          addResult(`📬 Vérifiez la boîte mail: ${testEmail}`)
          addResult('📄 Vérifiez aussi les spams/indésirables')
        } else {
          addResult('❌ Échec de l\'envoi d\'email')
          addResult('🔍 Vérifiez la configuration EmailJS')
        }
      }

    } catch (error) {
      addResult(`❌ Erreur lors du test: ${error}`)
    }
    
    setIsTesting(false)
  }

  const copyEnvironmentTemplate = () => {
    const template = `# Configuration EmailJS
NEXT_PUBLIC_EMAILJS_SERVICE_ID=your_service_id_here
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=your_template_id_here
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=your_public_key_here`

    navigator.clipboard.writeText(template).then(() => {
      addResult('📋 Template copié dans le presse-papiers!')
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">
              🔧 Diagnostic Email & Appel
            </h2>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
            >
              ×
            </button>
          </div>
          <p className="text-gray-600 mt-2">
            Diagnostic de la configuration EmailJS et test d'envoi
          </p>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-96">
          {/* Test Form */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">Test d'envoi d'email</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email de test
                </label>
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="votre.email@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom du conseiller test
                </label>
                <input
                  type="text"
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                  placeholder="Jean Dupont"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={testEmailConfiguration}
                disabled={isTesting}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:bg-gray-400 transition-colors"
              >
                {isTesting ? '🔄 Test en cours...' : '🧪 Tester la Configuration'}
              </button>
              
              <button
                onClick={copyEnvironmentTemplate}
                className="px-6 py-3 bg-gray-500 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors"
              >
                📋 Copier Template .env
              </button>
            </div>
          </div>

          {/* Results */}
          {results.length > 0 && (
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-64 overflow-y-auto">
              {results.map((result, index) => (
                <div key={index} className="mb-1">
                  {result}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            <h4 className="font-semibold mb-2">📚 Instructions de configuration:</h4>
            <ol className="list-decimal list-inside space-y-1">
              <li>Créez un compte sur <a href="https://www.emailjs.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">EmailJS.com</a></li>
              <li>Configurez un service email (Gmail, Outlook, etc.)</li>
              <li>Créez un template avec les variables: advisor_name, user_context, conversation_summary</li>
              <li>Ajoutez les clés dans votre fichier .env.local</li>
              <li>Redémarrez votre application</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EmailDiagnostic