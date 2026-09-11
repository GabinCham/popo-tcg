# PopoTCG

App perso pour suivre les cartes **SEC** One Piece, booster par booster.

Site : https://gabincham.github.io/popo-tcg/

## Lancer en local

Copie `.env.example` vers `.env` et renseigne l’URL + la clé anon Supabase (jamais committer `.env`).

```bash
npm install
npm run dev
```

Ouvre http://localhost:5173 et crée un compte.

Si la connexion dit que l’e-mail n’est pas confirmé, désactive la confirmation e-mail dans le dashboard Supabase (Authentication → Providers → Email).

## Base

La table `popo_owned_sec` se crée avec `supabase/migrations/0001_popo_owned_sec.sql` dans l’éditeur SQL du projet.
