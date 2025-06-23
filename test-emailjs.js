// Test rapide EmailJS
const emailjs = require('@emailjs/browser');

// Configuration depuis .env.local
const serviceId = 'service_f0sjdrg';
const templateId = 'template_k3wd6mi'; 
const publicKey = '82dYzmXc1wtyArf8s';

console.log('🧪 Test EmailJS Configuration');
console.log('Service ID:', serviceId);
console.log('Template ID:', templateId);
console.log('Public Key:', publicKey);

// Test basique
const testParams = {
  advisor_name: 'Test Conseiller',
  advisor_email: 'test@example.com',
  user_context: 'Test de diagnostic',
  conversation_summary: 'Test automatique'
};

console.log('📧 Tentative d\'envoi...');

emailjs.send(serviceId, templateId, testParams, publicKey)
  .then((result) => {
    console.log('✅ SUCCESS:', result);
  })
  .catch((error) => {
    console.log('❌ ERROR:', error);
  });