# CTG One Corporation - Corporate Website

**AI Strategy & Infrastructure**

Sitio web corporativo para CTG One Corporation — una empresa de tecnología y ecosistema empresarial integrado que diseña infraestructura tecnológica y arquitectura estratégica. Opera bajo una arquitectura dual: infraestructura tecnológica + agencia comercial con 10 unidades de negocio.

---

## 🚀 Tecnologías

- **Framework:** Next.js 14 (App Router)
- **React:** 18.2
- **TypeScript:** 5.3
- **Styling:** Tailwind CSS 3.4
- **Icons:** Lucide React
- **Deployment:** Vercel + Static Export

---

## 📁 Estructura del Proyecto

```
CTG One Website/
├── src/
│   ├── app/
│   │   ├── layout.tsx           # Layout principal + metadata
│   │   ├── page.tsx             # Página principal
│   │   ├── globals.css          # Estilos globales + variables CSS
│   │   └── dashboard/           # Dashboard administrativo
│   ├── components/
│   │   ├── Navbar.tsx           # Navegación responsive
│   │   ├── Footer.tsx           # Footer con links
│   │   ├── BlockchainNetwork.tsx # Visualización ecosistema
│   │   ├── sections/            # Secciones de la página
│   │   │   ├── HeroSection.tsx
│   │   │   ├── AboutSection.tsx
│   │   │   ├── ServicesSection.tsx
│   │   │   ├── EcosystemSection.tsx
│   │   │   ├── TokenSection.tsx
│   │   │   └── ContactSection.tsx
│   │   └── ui/                  # Componentes UI reutilizables
│   │       ├── Button.tsx
│   │       ├── Card.tsx
│   │       ├── Badge.tsx
│   │       └── FadeInSection.tsx
│   ├── config/
│   │   └── config.json          # ⚙️ Configuración centralizada (contacto, social)
│   ├── data/
│   │   └── content.ts           # Contenido del sitio
│   └── lib/
│       └── constants.ts         # Constantes y configuración
├── public/
│   └── images/
│       ├── logo/CTGLOGO.jpeg    # Logo corporativo
│       └── token/               # Imágenes del token
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## 🎨 Paleta de Colores

- **Background Primary:** `#050505` (Negro profundo)
- **Background Secondary:** `#0a0a0a` (Negro suave)
- **Accent (Gold):** `#c9a962` (Dorado refinado)
- **Text Primary:** `#ffffff` (Blanco)
- **Text Muted:** `#a3a3a3` (Gris)
- **Text Dim:** `#737373` (Gris oscuro)

---

## 🏗️ Secciones Implementadas

### ✅ Hero Section
- Logo corporativo
- Tagline: "Technology is infrastructure. Strategy is architecture."
- Descripción de arquitectura dual
- Métricas: 10 Business Units, Dual Architecture, Founded 2024
- Visualización del ecosistema blockchain

### ✅ About Section — Los 5 Pilares
1. Visión Integral del Cliente
2. Acceso Múltiple en un Solo Ecosistema
3. Confianza por Especialización
4. Continuidad en el Tiempo
5. Reducción de Riesgo

### ✅ Services Section — Tecnología & Agencia Comercial
- Tecnología & Ingeniería (AI, software, automatización)
- Equipo de Gestión Comercial (asesores de venta entrenados)
- Diseño & Comunicación
- Fintech & Créditos

### ✅ Ecosystem Section — 10 Unidades de Negocio
1. **Valderrama International School** — Educación y tutorías
2. **CTG Suites** — Hospitalidad en Cartagena y Santa Marta
3. **Bechara Real Estate** — Inmobiliaria de alto standing
4. **Hacienda San Benito** — Bienestar y naturaleza
5. **CTG One Corporation** — Core tecnológico
6. **Consultorio Veterinario Nicole Behar** — Veterinaria domiciliaria
7. **Oralgreen** — Odontología integral
8. **Legalyst Consultores** — Servicios legales
9. **CTG One Design** — Diseño y marketing
10. **Vantage Libranza Plus** — Créditos por libranza

### ✅ Token Section
- CTG One Token (CTGO)
- Tokenomics y distribución
- Utilidades del token

### ✅ Contact Section
- Información de contacto centralizada
- Email, teléfono, ubicación

---

## ⚙️ Configuración

La información de contacto está centralizada en `src/config/config.json`:

```json
{
  "contact": {
    "email": "direccion@ctgone.com",
    "phone": "+57 (5) 6661 7000",
    "location": "Cl. 17 Mz 10 L 21, El Campestre, Cartagena de Indias",
    "website": "www.ctgone.com"
  }
}
```

Para actualizar la información de contacto, solo edita este archivo.

---

## 🛠️ Comandos de Desarrollo

```bash
# Instalar dependencias
npm install

# Desarrollo local (http://localhost:3000)
npm run dev

# Build de producción
npm run build

# Lint
npm run lint
```

---

## 📦 Deployment

```bash
# 1. Build
npm run build

# 2. Push a GitHub
git add .
git commit -m "Update"
git push origin main

# 3. Vercel auto-deploys desde main
```

---

## 📞 Contacto

- **Email:** direccion@ctgone.com
- **Phone:** +57 (5) 6661 7000
- **Location:** Cl. 17 Mz 10 L 21, El Campestre, Cartagena de Indias
- **Website:** www.ctgone.com

---

## 📄 Licencia

© 2024-2026 CTG One Corporation. All rights reserved.

---

**Última actualización:** Febrero 2026  
**Versión:** 2.0.0
