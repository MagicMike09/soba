# Agent Virtuel - Assistant IA Interactif

Une application web interactive en Next.js mettant en scène un agent d'accueil virtuel piloté par IA, avec deux tableaux de bord pour la gestion du branding et de l'intelligence artificielle.

## 🎯 Fonctionnalités Principales

### Page Principale
- **Avatar 3D interactif** avec animations contextuelles (idle, talking, thinking, waiting, calling, laughing)
- **Conversation vocale temps réel** avec TTS et STT via OpenAI API
- **Interface minimaliste** style neo-minimal premium (noir/blanc)
- **Gestion des conseillers** avec système d'appel et notification email
- **Système d'aide** intégré avec tutoriel personnalisable
- **Boîte d'information** configurable (texte + média)

### Dashboard Client
- Gestion des logos (principal + footer)
- Configuration du texte d'aide
- Gestion de la boîte d'information (activation/désactivation, contenu, média)
- CRUD complet des conseillers (nom, prénom, position, email, téléphone, photo)
- Interface Bento design moderne

### Dashboard Brain
- Configuration de l'agent IA (nom, mission, personnalité)
- Upload et positionnement de l'avatar 3D (Sketchfab/GLB/GLTF)
- Configuration du modèle LLM (API key, modèle, température, URL)
- Gestion de la base de connaissances (PDF, CSV, TXT, JSON)
- Flux RSS pour les actualités
- Outils API externes
- Prononciations personnalisées

## 🛠️ Technologies Utilisées

- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS avec design neo-minimal
- **3D**: React Three Fiber pour l'avatar 3D
- **Backend**: Supabase (base de données, authentification, storage)
- **IA**: OpenAI API (GPT-4, TTS, STT multilingue)
- **Communication**: EmailJS pour les notifications
- **État**: React Context API

## 🚀 Installation et Configuration

### Prérequis
- Node.js 18+
- Compte Supabase
- Clé API OpenAI
- Compte EmailJS (optionnel)

### Installation

1. **Démarrer l'application**
```bash
npm run dev
```

L'application sera disponible sur `http://localhost:3000`

2. **Configuration environnement**
Vérifiez le fichier `.env.local` et ajoutez vos clés API :
```env
# Votre clé OpenAI
OPENAI_API_KEY=sk-...

# Configuration EmailJS (optionnel)
NEXT_PUBLIC_EMAILJS_SERVICE_ID=
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=
```

## 📱 Utilisation

### Page Principale (/)
- **Converser**: Cliquez pour démarrer une conversation vocale
- **Appeler**: Sélectionner un conseiller pour un appel
- **Aide**: Afficher le guide d'utilisation

### Dashboard Client (/dashboard/client)
- Gérer les logos de l'entreprise
- Configurer le texte d'aide
- Activer/désactiver la boîte d'information
- Ajouter/modifier/supprimer des conseillers

### Dashboard Brain (/dashboard/brain)
- Configurer l'agent IA (nom, mission, personnalité)
- Uploader et positionner l'avatar 3D
- Configurer le modèle LLM
- Gérer la base de connaissances
- Ajouter des flux RSS et outils API
- Définir des prononciations personnalisées

## 🎨 Design

Le design suit les principes du **neo-minimalisme premium** :
- Contrastes forts noir/blanc
- Interfaces épurées mais sophistiquées
- Animations subtiles et fluides
- Focus sur l'essentiel
- Accessibilité et ergonomie

## 🌍 Multilinguisme

Le TTS et STT supportent :
- Français (par défaut)
- Anglais
- Allemand
- Italien
- Espagnol
- Portugais

## 📋 Prochaines étapes

Pour une utilisation complète, il faudra :
1. Configurer les tables Supabase selon le schéma fourni
2. Ajouter votre clé API OpenAI
3. Configurer EmailJS pour les notifications
4. Uploader des avatars 3D (format GLB/GLTF)
5. Personnaliser l'agent IA via le Dashboard Brain

## 🏗️ Architecture

```
src/
├── app/                    # Pages Next.js 15 (App Router)
│   ├── dashboard/
│   │   ├── client/        # Dashboard client
│   │   └── brain/         # Dashboard brain
│   ├── layout.tsx
│   └── page.tsx           # Page principale
├── components/            # Composants React
├── contexts/              # Contextes React
├── lib/                   # Configuration
├── utils/                 # Utilitaires
└── types/                # Types TypeScript
```
