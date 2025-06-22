'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Advisor, BrandConfig } from '@/types'

interface FileUploadProps {
  onUpload: (url: string) => void
  accept?: string
  label: string
  currentUrl?: string
}

const FileUpload: React.FC<FileUploadProps> = ({ onUpload, accept, label, currentUrl }) => {
  const [uploading, setUploading] = useState(false)

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const { error } = await supabase.storage
        .from('uploads')
        .upload(fileName, file)

      if (error) throw error

      const { data: urlData } = supabase.storage
        .from('uploads')
        .getPublicUrl(fileName)

      onUpload(urlData.publicUrl)
    } catch (error) {
      console.error('Error uploading file:', error)
      alert('Erreur lors du téléchargement')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex items-center space-x-4">
        <input
          type="file"
          accept={accept}
          onChange={handleUpload}
          disabled={uploading}
          className="hidden"
          id={`upload-${label.replace(/\s/g, '-')}`}
        />
        <label
          htmlFor={`upload-${label.replace(/\s/g, '-')}`}
          className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {uploading ? 'Téléchargement...' : 'Choisir fichier'}
        </label>
        {currentUrl && (
          <img src={currentUrl} alt="Preview" className="w-12 h-12 object-cover rounded" />
        )}
      </div>
    </div>
  )
}

export default function ClientDashboard() {
  const [advisors, setAdvisors] = useState<Advisor[]>([])
  const [brandConfig, setBrandConfig] = useState<BrandConfig | null>(null)
  const [editingAdvisor, setEditingAdvisor] = useState<Advisor | null>(null)
  const [showAdvisorForm, setShowAdvisorForm] = useState(false)
  const [helpText, setHelpText] = useState('')
  const [infoBoxContent, setInfoBoxContent] = useState('')
  const [infoBoxEnabled, setInfoBoxEnabled] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [advisorsResult, brandResult] = await Promise.all([
        supabase.from('advisors').select('*'),
        supabase.from('brand_config').select('*').single()
      ])

      if (advisorsResult.data) {
        setAdvisors(advisorsResult.data.map(advisor => ({
          id: advisor.id,
          name: advisor.name,
          firstName: advisor.first_name,
          lastName: advisor.last_name,
          phone: advisor.phone,
          email: advisor.email,
          photoUrl: advisor.photo_url,
          position: advisor.position
        })))
      }

      if (brandResult.data) {
        const config = {
          id: brandResult.data.id,
          mainLogoUrl: brandResult.data.main_logo_url,
          footerLogo1Url: brandResult.data.footer_logo_1_url,
          footerLogo2Url: brandResult.data.footer_logo_2_url,
          helpText: brandResult.data.help_text,
          infoBoxEnabled: brandResult.data.info_box_enabled,
          infoBoxContent: brandResult.data.info_box_content,
          infoBoxMediaUrl: brandResult.data.info_box_media_url,
          infoBoxMediaType: brandResult.data.info_box_media_type as 'image' | 'video'
        }
        setBrandConfig(config)
        setHelpText(config.helpText || '')
        setInfoBoxContent(config.infoBoxContent || '')
        setInfoBoxEnabled(config.infoBoxEnabled)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  const saveAdvisor = async (advisor: Partial<Advisor>) => {
    try {
      const advisorData = {
        name: advisor.name!,
        first_name: advisor.firstName!,
        last_name: advisor.lastName!,
        phone: advisor.phone!,
        email: advisor.email!,
        photo_url: advisor.photoUrl,
        position: advisor.position!
      }

      if (advisor.id) {
        await supabase.from('advisors').update(advisorData).eq('id', advisor.id)
      } else {
        await supabase.from('advisors').insert(advisorData)
      }

      loadData()
      setEditingAdvisor(null)
      setShowAdvisorForm(false)
    } catch (error) {
      console.error('Error saving advisor:', error)
      alert('Erreur lors de la sauvegarde')
    }
  }

  const deleteAdvisor = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce conseiller ?')) {
      try {
        await supabase.from('advisors').delete().eq('id', id)
        loadData()
      } catch (error) {
        console.error('Error deleting advisor:', error)
        alert('Erreur lors de la suppression')
      }
    }
  }

  const updateBrandConfig = async (updates: Partial<BrandConfig>) => {
    if (!brandConfig) return

    try {
      const updateData = {
        main_logo_url: updates.mainLogoUrl ?? brandConfig.mainLogoUrl,
        footer_logo_1_url: updates.footerLogo1Url ?? brandConfig.footerLogo1Url,
        footer_logo_2_url: updates.footerLogo2Url ?? brandConfig.footerLogo2Url,
        help_text: updates.helpText ?? brandConfig.helpText,
        info_box_enabled: updates.infoBoxEnabled ?? brandConfig.infoBoxEnabled,
        info_box_content: updates.infoBoxContent ?? brandConfig.infoBoxContent,
        info_box_media_url: updates.infoBoxMediaUrl ?? brandConfig.infoBoxMediaUrl,
        info_box_media_type: updates.infoBoxMediaType ?? brandConfig.infoBoxMediaType
      }

      await supabase.from('brand_config').update(updateData).eq('id', brandConfig.id)
      loadData()
    } catch (error) {
      console.error('Error updating brand config:', error)
      alert('Erreur lors de la mise à jour')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Client</h1>
          <p className="text-gray-600 mt-2">Gérez l&apos;apparence et les conseillers de votre agent virtuel</p>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Logo Management */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 lg:col-span-2">
            <h2 className="text-xl font-semibold mb-4">Gestion des Logos</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FileUpload
                label="Logo Principal"
                accept="image/*"
                currentUrl={brandConfig?.mainLogoUrl}
                onUpload={(url) => updateBrandConfig({ mainLogoUrl: url })}
              />
              <FileUpload
                label="Logo Footer 1"
                accept="image/*"
                currentUrl={brandConfig?.footerLogo1Url}
                onUpload={(url) => updateBrandConfig({ footerLogo1Url: url })}
              />
              <FileUpload
                label="Logo Footer 2"
                accept="image/*"
                currentUrl={brandConfig?.footerLogo2Url}
                onUpload={(url) => updateBrandConfig({ footerLogo2Url: url })}
              />
            </div>
          </div>

          {/* Help Text */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <h2 className="text-xl font-semibold mb-4">Texte d'Aide</h2>
            <div className="space-y-4">
              <textarea
                value={helpText}
                onChange={(e) => setHelpText(e.target.value)}
                rows={8}
                className="w-full p-3 border border-gray-300 rounded-lg resize-none"
                placeholder="Entrez le texte d&apos;aide..."
              />
              <button
                onClick={() => updateBrandConfig({ helpText })}
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Sauvegarder
              </button>
            </div>
          </div>

          {/* Info Box Management */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 lg:col-span-2">
            <h2 className="text-xl font-semibold mb-4">Boîte d&apos;Information</h2>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="infoBoxEnabled"
                  checked={infoBoxEnabled}
                  onChange={(e) => {
                    setInfoBoxEnabled(e.target.checked)
                    updateBrandConfig({ infoBoxEnabled: e.target.checked })
                  }}
                  className="w-5 h-5"
                />
                <label htmlFor="infoBoxEnabled" className="font-medium">
                  Activer la boîte d&apos;information
                </label>
              </div>
              
              <textarea
                value={infoBoxContent}
                onChange={(e) => setInfoBoxContent(e.target.value)}
                rows={4}
                className="w-full p-3 border border-gray-300 rounded-lg resize-none"
                placeholder="Contenu HTML de la boîte d&apos;information..."
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FileUpload
                  label="Image/Vidéo"
                  accept="image/*,video/*"
                  currentUrl={brandConfig?.infoBoxMediaUrl}
                  onUpload={(url) => updateBrandConfig({ infoBoxMediaUrl: url })}
                />
                <button
                  onClick={() => updateBrandConfig({ infoBoxContent })}
                  className="bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors self-end"
                >
                  Sauvegarder Contenu
                </button>
              </div>
            </div>
          </div>

          {/* Advisor Management */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 lg:col-span-3">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Gestion des Conseillers</h2>
              <button
                onClick={() => setShowAdvisorForm(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                Ajouter Conseiller
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {advisors.map((advisor) => (
                <div key={advisor.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-12 h-12 bg-gray-200 rounded-full overflow-hidden">
                      {advisor.photoUrl ? (
                        <img
                          src={advisor.photoUrl}
                          alt={advisor.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          👤
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium">{advisor.firstName} {advisor.lastName}</h3>
                      <p className="text-sm text-gray-600">{advisor.position}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{advisor.email}</p>
                  <p className="text-sm text-gray-600 mb-3">{advisor.phone}</p>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setEditingAdvisor(advisor)
                        setShowAdvisorForm(true)
                      }}
                      className="flex-1 bg-blue-600 text-white py-1 px-2 rounded text-sm hover:bg-blue-700 transition-colors"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => deleteAdvisor(advisor.id)}
                      className="flex-1 bg-red-600 text-white py-1 px-2 rounded text-sm hover:bg-red-700 transition-colors"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Advisor Form Modal */}
        {showAdvisorForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">
                {editingAdvisor ? 'Modifier' : 'Ajouter'} Conseiller
              </h3>
              <form onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                saveAdvisor({
                  id: editingAdvisor?.id,
                  name: formData.get('name') as string,
                  firstName: formData.get('firstName') as string,
                  lastName: formData.get('lastName') as string,
                  phone: formData.get('phone') as string,
                  email: formData.get('email') as string,
                  position: formData.get('position') as string,
                  photoUrl: editingAdvisor?.photoUrl
                })
              }}>
                <div className="space-y-4">
                  <input
                    name="firstName"
                    placeholder="Prénom"
                    defaultValue={editingAdvisor?.firstName}
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg"
                  />
                  <input
                    name="lastName"
                    placeholder="Nom"
                    defaultValue={editingAdvisor?.lastName}
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg"
                  />
                  <input
                    name="name"
                    placeholder="Nom complet"
                    defaultValue={editingAdvisor?.name}
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg"
                  />
                  <input
                    name="position"
                    placeholder="Poste"
                    defaultValue={editingAdvisor?.position}
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg"
                  />
                  <input
                    name="email"
                    type="email"
                    placeholder="Email"
                    defaultValue={editingAdvisor?.email}
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg"
                  />
                  <input
                    name="phone"
                    placeholder="Téléphone"
                    defaultValue={editingAdvisor?.phone}
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg"
                  />
                  
                  {editingAdvisor && (
                    <FileUpload
                      label="Photo"
                      accept="image/*"
                      currentUrl={editingAdvisor.photoUrl}
                      onUpload={(url) => setEditingAdvisor({...editingAdvisor, photoUrl: url})}
                    />
                  )}
                </div>
                
                <div className="flex space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAdvisorForm(false)
                      setEditingAdvisor(null)
                    }}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Sauvegarder
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}