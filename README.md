# 🍽️ Mon Garde-Manger

Une application moderne de gestion de garde-manger avec synchronisation temps réel, planification de repas et génération automatique de listes de courses.

![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e)

## ✨ Fonctionnalités

- 📦 **Garde-manger intelligent** - Gérez vos produits par emplacement (frigo, congélateur, placard, cave)
- ⏰ **Alertes d'expiration** - Notifications pour les produits qui expirent bientôt
- 📖 **Livre de recettes** - Créez et organisez vos recettes favorites
- 🔗 **Import de recettes** - Importez des recettes directement depuis des URLs
- 📅 **Planning hebdomadaire** - Planifiez vos repas pour toute la semaine
- 🛒 **Liste de courses automatique** - Générée depuis votre menu avec détection des manquants
- 💡 **Suggestions intelligentes** - Recettes basées sur vos ingrédients disponibles
- 📊 **Statistiques** - Visualisez vos données de stock et consommation
- 🌓 **Mode sombre** - Interface adaptative jour/nuit
- 📱 **Responsive** - Optimisé pour mobile, tablette et desktop
- 🔄 **Sync temps réel** - Données synchronisées instantanément sur tous vos appareils

## 🚀 Installation

### Prérequis

- Node.js 18+ 
- Un compte [Supabase](https://supabase.com) (gratuit)
- Un compte [Vercel](https://vercel.com) (gratuit, optionnel pour le déploiement)

### 1. Cloner le projet

```bash
git clone https://github.com/votre-username/garde-manger-app.git
cd garde-manger-app
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configurer Supabase

1. Créez un nouveau projet sur [Supabase](https://supabase.com)
2. Accédez à l'éditeur SQL et exécutez le fichier `supabase/schema.sql`
3. Récupérez votre URL et clé API dans Settings > API

### 4. Configuration des variables d'environnement

Créez un fichier `.env.local` à la racine :

```env
NEXT_PUBLIC_SUPABASE_URL=votre_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle_anon_supabase
```

### 5. Lancer en local

```bash
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur.

## 📦 Déploiement sur Vercel

### Via GitHub (recommandé)

1. Pushez votre code sur GitHub
2. Connectez-vous sur [Vercel](https://vercel.com)
3. Cliquez sur "Import Project"
4. Sélectionnez votre repository
5. Ajoutez vos variables d'environnement
6. Cliquez sur "Deploy"

### Via CLI

```bash
npm install -g vercel
vercel
```

## 🗄️ Structure du projet

```
garde-manger-app/
├── app/
│   ├── api/
│   │   └── scrape-recipe/     # API d'import de recettes
│   ├── globals.css             # Styles globaux
│   ├── layout.tsx              # Layout racine
│   └── page.tsx                # Page principale
├── components/
│   └── tabs/                   # Composants des onglets
│       ├── PantryTab.tsx
│       ├── RecipesTab.tsx
│       ├── MenuTab.tsx
│       ├── ShoppingTab.tsx
│       ├── SuggestionsTab.tsx
│       └── StatsTab.tsx
├── lib/
│   ├── supabase.ts            # Client Supabase
│   └── store.ts               # Store Zustand
├── supabase/
│   └── schema.sql             # Schéma de base de données
└── public/                    # Assets statiques
```

## 🎨 Design System

L'application utilise un design moderne avec :

- **Glassmorphism** - Cartes avec effet verre dépoli
- **Gradient dynamiques** - Couleurs orange/ambre avec animations
- **Micro-interactions** - Animations Framer Motion fluides
- **Typography** - Inter pour le corps, Playfair Display pour les titres
- **Dark mode** - Thème adaptatif automatique

## 🔧 Technologies

- **Framework** : Next.js 14 (App Router)
- **Language** : TypeScript
- **Styling** : Tailwind CSS
- **Animations** : Framer Motion
- **Base de données** : Supabase (PostgreSQL)
- **State Management** : Zustand
- **Icons** : Lucide React
- **Date handling** : date-fns
- **Notifications** : React Hot Toast

## 📝 Fonctionnalités à venir

- [ ] Authentification multi-utilisateurs
- [ ] Export PDF des listes de courses
- [ ] Scan de codes-barres
- [ ] IA pour suggestions de recettes
- [ ] Partage de recettes entre utilisateurs
- [ ] Mode hors-ligne (PWA)
- [ ] Intégration calendrier
- [ ] Notifications push

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à :

1. Fork le projet
2. Créer une branche (`git checkout -b feature/AmazingFeature`)
3. Commit vos changements (`git commit -m 'Add AmazingFeature'`)
4. Push sur la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📄 License

MIT

## 🙏 Remerciements

- Design inspiré par les tendances modernes de UI/UX
- Icons par [Lucide](https://lucide.dev)
- Fonts par [Google Fonts](https://fonts.google.com)

---

Fait avec ❤️ pour simplifier la gestion de votre cuisine
