# Rally Timing (HTML + Firebase Firestore)

Web estática (HTML/CSS/JS) con Firebase Auth + Firestore:
- Login
- Puesto / tirilla de marcajes
- Ajustes de penalización CH
- Visor (demo con TC1/TC2/CH1)

## Setup Firebase
1) Firebase Console → Authentication → habilita Email/Password
2) Firestore Database → crea la BD
3) Project settings → crea Web App → copia firebaseConfig en `firebase.js`
4) Authentication → Settings → Authorized domains:
   - TUUSUARIO.github.io

## Deploy GitHub Pages
Repo → Settings → Pages → Deploy from branch → main → /(root)

## Roles
En Firestore:
`users/{uid}` con campo `role`: "admin" | "operator" | "viewer"

## Rutas Firestore
- rallies/{rallyId}
- rallies/{rallyId}/settings/chPenalties
- rallies/{rallyId}/marks/{controlId}/items/{markId}
