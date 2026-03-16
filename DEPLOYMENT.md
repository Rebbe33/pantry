# 🚀 Guide de Déploiement Rapide

## Configuration Supabase (5 minutes)

### 1. Créer un projet Supabase

1. Allez sur [supabase.com](https://supabase.com)
2. Cliquez sur "Start your project"
3. Créez un nouveau projet (choisissez une région proche, ex: Paris pour l'Europe)
4. Notez votre mot de passe de base de données

### 2. Configurer la base de données

1. Dans votre dashboard Supabase, allez dans "SQL Editor"
2. Cliquez sur "New query"
3. Copiez-collez tout le contenu du fichier `supabase/schema.sql`
4. Cliquez sur "Run"
5. Vérifiez que les tables sont créées dans "Table Editor"

### 3. Activer l'authentification

1. Allez dans "Authentication" > "Providers"
2. Activez "Email" (déjà activé par défaut)
3. Optionnel : Activez Google, GitHub, etc.

### 4. Activer Realtime

1. Allez dans "Database" > "Replication"
2. Activez la réplication pour les tables :
   - `pantry_items`
   - `recipes`
   - `menu_items`

### 5. Récupérer vos clés API

1. Allez dans "Settings" > "API"
2. Notez :
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Déploiement sur Vercel (3 minutes)

### Option 1 : Via l'interface Vercel (Recommandé)

1. **Pushez votre code sur GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/votre-username/garde-manger-app.git
   git push -u origin main
   ```

2. **Connectez-vous à Vercel**
   - Allez sur [vercel.com](https://vercel.com)
   - Cliquez sur "Import Project"
   - Sélectionnez votre repository GitHub

3. **Configurez les variables d'environnement**
   - Dans "Environment Variables", ajoutez :
     ```
     NEXT_PUBLIC_SUPABASE_URL=votre_url_supabase
     NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle_anon
     ```

4. **Déployez**
   - Cliquez sur "Deploy"
   - Attendez 1-2 minutes
   - Votre app est en ligne ! 🎉

### Option 2 : Via la CLI Vercel

```bash
# Installer Vercel CLI
npm i -g vercel

# Se connecter
vercel login

# Déployer
vercel

# Suivez les instructions et ajoutez vos variables d'environnement
```

## Configuration Post-Déploiement

### 1. Configurer l'URL de l'application dans Supabase

1. Dans Supabase, allez dans "Authentication" > "URL Configuration"
2. Ajoutez votre URL Vercel dans "Site URL" : `https://votre-app.vercel.app`
3. Ajoutez aussi dans "Redirect URLs"

### 2. Tester l'application

1. Ouvrez votre URL Vercel
2. Créez un compte utilisateur
3. Ajoutez quelques produits de test
4. Vérifiez que tout fonctionne

### 3. Configurer le domaine personnalisé (Optionnel)

1. Dans Vercel, allez dans "Settings" > "Domains"
2. Ajoutez votre domaine personnalisé
3. Suivez les instructions DNS

## Déploiements automatiques

Une fois configuré avec GitHub + Vercel :

- ✅ Chaque push sur `main` déclenche un déploiement automatique
- ✅ Les pull requests créent des previews automatiques
- ✅ Rollback en un clic en cas de problème

## Résolution de problèmes

### Erreur : "Failed to connect to Supabase"
- Vérifiez que vos variables d'environnement sont correctes
- Vérifiez que les tables sont bien créées dans Supabase

### Erreur : "Row Level Security"
- Vérifiez que toutes les policies RLS sont bien créées
- Exécutez à nouveau le fichier `schema.sql`

### L'application est lente
- Vérifiez les index de la base de données
- Activez le cache Vercel
- Optimisez les requêtes Supabase

## Monitoring

### Supabase
- Allez dans "Database" > "Reports" pour voir les métriques
- Surveillez les requêtes lentes dans "Logs"

### Vercel
- Allez dans "Analytics" pour voir le trafic
- Surveillez les erreurs dans "Logs"

## Coûts

### Supabase (Plan gratuit)
- ✅ 500 MB de base de données
- ✅ 1 GB de stockage fichiers
- ✅ 2 GB de bande passante
- ✅ 50 000 utilisateurs actifs mensuels

### Vercel (Plan gratuit)
- ✅ Bande passante illimitée
- ✅ 100 GB-Heures d'exécution
- ✅ Déploiements illimités

**Pour la plupart des utilisateurs personnels, le plan gratuit est largement suffisant !**

## Support

Si vous rencontrez des problèmes :
1. Vérifiez les logs dans Vercel
2. Vérifiez les logs dans Supabase
3. Ouvrez une issue sur GitHub
4. Consultez la documentation Next.js / Supabase

---

Bon déploiement ! 🚀
