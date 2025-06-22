'use client'

import Link from 'next/link'

export default function TestDeploy() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🚀 Test de Déploiement</h1>
        
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">État du Déploiement</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>Date de build:</span>
              <span className="font-mono">{new Date().toISOString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Dernière modification:</span>
              <span>Canvas 3D + Images fixes</span>
            </div>
            <div className="flex justify-between">
              <span>Version:</span>
              <span className="text-green-600">v1.2.0</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Modifications attendues</h2>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
              Canvas 3D en arrière-plan complet de la page principale
            </li>
            <li className="flex items-center">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
              Images Supabase qui s'affichent correctement
            </li>
            <li className="flex items-center">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
              Configuration Next.js pour domaines externes
            </li>
            <li className="flex items-center">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
              Gestion d'erreurs pour toutes les images
            </li>
          </ul>
        </div>

        <div className="mt-6 text-center">
          <Link 
            href="/" 
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors inline-block"
          >
            ← Retour à la page principale
          </Link>
        </div>
      </div>
    </div>
  )
}