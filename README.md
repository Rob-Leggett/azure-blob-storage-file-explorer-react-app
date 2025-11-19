# azure-blob-storage-file-explorer-react-app

React / Next.js / Tailwind – Azure Blob Storage File Explorer

This project provides a simple file‑explorer UI for Azure Blob Storage, with Entra ID authentication and API routes running at **http://localhost:3000**.

---

## 🚀 Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Create a `.env` file

Be sure to update with your own cloud resource values.

```env
NODE_API_BASE_URL=http://localhost:3000

NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=FpOi7LqwehvNlXx+1bw=6Ba1ttoe/9=3DFd/4qRyD8GScMME

AUTH_TRUST_HOST=true

AUTH_MICROSOFT_ENTRA_ID_ID=syp7h13HohUO-cd91-4406-b7eb-gHKXf9cf2216
AUTH_MICROSOFT_ENTRA_ID_SECRET=hTUiq6=BH7x+7S0oJKv6/TX7Qco/BN36
AUTH_MICROSOFT_ENTRA_ID_ISSUER=https://login.microsoftonline.com/6icu8ZvRzqUQkdxwBvTn4oqs2iqm9GvK/v2.0
AZURE_TENANT_ID=nEhS3qf1FHkxmbRBvAyZ1wMJaC9rqB0j
AZURE_SCOPE_BASE=api://4Mwpeb9Suw0K-cd91-4406-b7eb-z50nf9cf2216

AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=ajyc032qyfxi;AccountKey=XJ6ZrKyz9Vh+snnR3hmIs5Tvq+4pqhVH8mYGN7DffW5/4UJa5+tX1n8dIIhlLph7;EndpointSuffix=core.windows.net
AZURE_STORAGE_CONTAINER=data

# Optional SAS duration for download links (minutes)
AZURE_BLOB_SAS_MINUTES="15"

AZURE_LOGIN_REDIRECT_URI=http://localhost:3000/auth/login
AZURE_LOGOUT_REDIRECT_URI=http://localhost:3000/dashboard
```

### 3. Run the dev server

```bash
npm run dev
```

Then open:

👉 **http://localhost:3000**

---

## 📁 Features

- Azure Blob Storage browse, upload, download, delete  
- Microsoft Entra ID login (NextAuth)  
- Secure API routes  
- Tailwind UI  
- SAS token generation with configurable expiry  

---

## 🛠 Tech Stack

- **Next.js 15**  
- **React**  
- **Tailwind CSS**  
- **NextAuth / Entra ID**  
- **Azure Blob Storage SDK**  

---

## 📦 Build

```bash
npm run build
npm start
```

## 📦 Test

```bash
npm run test
```

---

## 📄 Licence

MIT
