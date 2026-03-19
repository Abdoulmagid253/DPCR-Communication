// generate_png.js — DPCR SA · Calendrier Éditorial Avril 2026
// Génère les PNG pour tous les visuels via Playwright/Chromium
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
const fs = require('fs');

const VISUELS_DIR = path.join(__dirname, 'visuels');
const PNG_DIR     = path.join(__dirname, 'png');

// Ensure output dir exists
if (!fs.existsSync(PNG_DIR)) fs.mkdirSync(PNG_DIR, { recursive: true });

// Configuration des captures par fichier
// Chaque entry = { file, label, captures: [ { selector|fullPage, suffix, width, height } ] }
const JOBS = [
  {
    file: '00_charte_graphique.html',
    label: 'Charte Graphique',
    captures: [
      { fullPage: true, suffix: 'charte_graphique_DPCR_2026', width: 1200 }
    ]
  },
  {
    file: '01_02avril_dessu_corridor.html',
    label: '02 Avril — DESSU Corridor',
    captures: [
      // LinkedIn 16:9
      { selector: '.post-linkedin', suffix: '01_DESSU_linkedin_16x9',     width: 1200, height: 628 },
      // Facebook 1:1
      { selector: '.post-facebook', suffix: '01_DESSU_facebook_1x1',      width: 1080, height: 1080 }
    ]
  },
  {
    file: '02_05avril_securite_distances.html',
    label: '05 Avril — Sécurité Distances',
    captures: [
      { selector: '.post-sq',   suffix: '02_Securite_facebook_1x1',    width: 1080, height: 1080 },
      { selector: '.post-wide', suffix: '02_Securite_linkedin_16x9',   width: 1200, height: 628  }
    ]
  },
  {
    file: '03_08avril_continuite_24h.html',
    label: '08 Avril — Continuité 24/7',
    captures: [
      { selector: '.post-wide', suffix: '03_Continuite_linkedin_16x9', width: 1200, height: 628  },
      { selector: '.post-sq',   suffix: '03_Continuite_facebook_1x1',  width: 1080, height: 1080 }
    ]
  },
  {
    file: '04_11avril_rn18_chantier.html',
    label: '11 Avril — RN18 Carrousel',
    captures: [
      { selector: '.slide-1', suffix: '04_RN18_slide1_terrassement', width: 1080, height: 1080 },
      { selector: '.slide-2', suffix: '04_RN18_slide2_chiffres',     width: 1080, height: 1080 },
      { selector: '.slide-3', suffix: '04_RN18_slide3_vision',       width: 1080, height: 1080 }
    ]
  },
  {
    file: '05_14avril_corridorvision_ai.html',
    label: '14 Avril — CorridorVision AI',
    captures: [
      { selector: '.post-wide', suffix: '05_IA_linkedin_16x9',       width: 1200, height: 628  },
      { selector: '.post-sq',   suffix: '05_IA_linkedin_1x1',        width: 1080, height: 1080 }
    ]
  },
  {
    file: '06_16avril_quiz_khamsin.html',
    label: '16 Avril — Quiz Khamsin',
    captures: [
      { selector: '.post-sq',   suffix: '06_Quiz_facebook_1x1',      width: 1080, height: 1080 },
      { selector: '.post-wide', suffix: '06_Quiz_16x9',              width: 1200, height: 628  }
    ]
  },
  {
    file: '07_20avril_pregate_vert.html',
    label: '20 Avril — Pre-gate ESG',
    captures: [
      { selector: '.post-wide', suffix: '07_PreGate_linkedin_16x9',  width: 1200, height: 628  },
      { selector: '.post-sq',   suffix: '07_PreGate_facebook_1x1',   width: 1080, height: 1080 }
    ]
  },
  {
    file: '08_23avril_fms_dpcs.html',
    label: '23 Avril — FMS ↔ DPCS',
    captures: [
      { selector: '.post-wide', suffix: '08_FMS_linkedin_16x9',      width: 1200, height: 628  },
      { selector: '.post-sq',   suffix: '08_FMS_linkedin_1x1',       width: 1080, height: 1080 }
    ]
  },
  {
    file: '09_28avril_oit_equipes.html',
    label: '28 Avril — Journée OIT',
    captures: [
      { selector: '.post-wide', suffix: '09_OIT_all_16x9',           width: 1200, height: 628  },
      { selector: '.post-sq',   suffix: '09_OIT_facebook_1x1',       width: 1080, height: 1080 }
    ]
  }
];

async function run() {
  console.log('\n🎨 DPCR SA — Génération des visuels PNG\n' + '─'.repeat(50));
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });

  let totalGenerated = 0;

  for (const job of JOBS) {
    const filePath = path.join(VISUELS_DIR, job.file);
    const fileUrl  = 'file://' + filePath;

    console.log(`\n📄 ${job.label}`);
    console.log(`   Source : ${job.file}`);

    for (const cap of job.captures) {
      const page = await browser.newPage();

      // Viewport large enough to render everything
      const vpWidth  = cap.width  || 1400;
      const vpHeight = cap.height || 900;
      await page.setViewportSize({ width: vpWidth, height: vpHeight });
      await page.goto(fileUrl, { waitUntil: 'networkidle' });

      // Small pause for animations/fonts
      await page.waitForTimeout(500);

      const outFile = path.join(PNG_DIR, cap.suffix + '.png');

      if (cap.fullPage) {
        await page.screenshot({ path: outFile, fullPage: true });
      } else {
        // clip to selector element
        const el = await page.$(cap.selector);
        if (!el) {
          console.warn(`   ⚠️  Sélecteur "${cap.selector}" introuvable, capture plein écran`);
          await page.screenshot({ path: outFile });
        } else {
          // Scroll element into view then get accurate bounding box
          await el.scrollIntoViewIfNeeded();
          await page.waitForTimeout(200);
          const box = await el.boundingBox();
          if (!box || box.width <= 0 || box.height <= 0) {
            console.warn(`   ⚠️  BBox invalide pour "${cap.selector}", capture plein écran`);
            await page.screenshot({ path: outFile });
          } else {
            // Use a viewport large enough to include the element
            const neededH = Math.ceil(box.y + box.height) + 50;
            if (neededH > vpHeight) {
              await page.setViewportSize({ width: vpWidth, height: neededH });
              await page.waitForTimeout(100);
            }
            const freshBox = await el.boundingBox();
            await page.screenshot({
              path: outFile,
              clip: {
                x: freshBox.x,
                y: freshBox.y,
                width:  freshBox.width,
                height: freshBox.height
              }
            });
          }
        }
      }

      const size = (fs.statSync(outFile).size / 1024).toFixed(0);
      console.log(`   ✅  ${cap.suffix}.png  (${size} KB)`);
      totalGenerated++;
      await page.close();
    }
  }

  await browser.close();

  console.log('\n' + '─'.repeat(50));
  console.log(`✨ Terminé — ${totalGenerated} fichiers PNG générés dans :`);
  console.log(`   ${PNG_DIR}\n`);

  // List all generated files
  const files = fs.readdirSync(PNG_DIR).filter(f => f.endsWith('.png'));
  files.forEach(f => {
    const size = (fs.statSync(path.join(PNG_DIR, f)).size / 1024).toFixed(0);
    console.log(`   📸  ${f}  (${size} KB)`);
  });
}

run().catch(err => {
  console.error('❌ Erreur :', err);
  process.exit(1);
});
