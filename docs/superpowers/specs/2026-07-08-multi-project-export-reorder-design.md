# Design: Multi-progetto, export/import, riordino post

Data: 2026-07-08

## Contesto

Il simulatore Instagram (`app.js`, `index.html`, `style.css`) è un'app single-file vanilla JS con un solo profilo hardcoded ("lasertech_schio") persistito in `localStorage`. Analisi della repo ha identificato 4 miglioramenti ad alto impatto:

1. Export del mockup come immagine (per condividere il design col cliente)
2. Multi-progetto (l'agenzia gestisce più clienti, oggi un solo profilo sovrascrivibile)
3. Import/export JSON dello stato (backup e condivisione tra postazioni)
4. Drag & drop per riordinare i post nella griglia

## Architettura file

`app.js` (869 righe) cresce troppo aggiungendo le 4 feature. Viene diviso in moduli ES6 nativi (`<script type="module">`, nessun bundler):

- `js/storage.js` — gestione progetti multipli, migrazione dal formato legacy, helper di lettura/scrittura localStorage
- `js/export.js` — export immagine (html2canvas) e import/export JSON del progetto
- `js/reorder.js` — drag & drop nella manage list
- `js/app.js` — logica esistente (profilo, post, overlay/carousel, iOS mockup) più il wiring tra moduli

La logica esistente non viene riscritta, solo spostata e ricollegata. `index.html` cambia lo script tag a `type="module"` e aggiunge `<script src=".../html2canvas.min.js">` da CDN.

## Modello dati

Nuove chiavi `localStorage`:

- `ig_projects`: array di oggetti `{ id, name, profile, posts, avatar, createdAt }`
- `ig_active_project_id`: id del progetto correntemente attivo

Le impostazioni telefono (ora, batteria, overlay iOS, dark mode) restano **non persistite**, come nel comportamento attuale — sono impostazioni di sessione dello strumento, non del progetto.

### Migrazione

Al primo avvio dopo l'update:
- Se `ig_projects` non esiste e le vecchie chiavi (`ig_profile_posts`, `ig_profile_avatar`, `ig_profile_info`) esistono → crea un progetto `{ name: 'lasertech_schio', ... }` da quei dati, lo marca attivo, lo salva in `ig_projects`.
- Se non esiste nulla → crea un progetto default vuoto con profilo placeholder.
- Le vecchie chiavi restano presenti ma non vengono più lette/scritte dopo la migrazione (nessuna cancellazione esplicita, per sicurezza).

### Operazioni sui progetti

UI: dropdown `<select>` in cima alla sidebar col nome del progetto attivo, più pulsanti icona accanto:

- **Nuovo**: `prompt()` per il nome → crea progetto vuoto (profilo placeholder, nessun post) → diventa attivo.
- **Rinomina**: `prompt()` precompilato col nome corrente → aggiorna `name` del progetto attivo.
- **Duplica**: copia profondo del progetto attivo (profilo, post, avatar) con nome `"<nome> (copia)"` → diventa attivo.
- **Elimina**: `confirm()` di conferma → rimuove il progetto; se era l'unico rimasto, ne crea automaticamente uno vuoto al suo posto (non si può restare senza progetti); altrimenti attiva il primo progetto rimanente.
- **Switch** (selezione dropdown): carica profilo/post/avatar del progetto scelto nello stato in memoria, richiama `syncSidebarToProfileForm()`, `updateProfileMockup()`, `renderGrid()`, `renderManageList()`.

Ogni operazione persiste subito `ig_projects` e `ig_active_project_id`.

## Export immagine

- Libreria `html2canvas` caricata da CDN in `index.html`.
- Bottone "📸 Esporta immagine" nel pannello destro (vicino ai controlli esistenti).
- Cattura l'elemento del frame iPhone (mockup + contenuto), non l'intera pagina/sidebar.
- Genera PNG e lo scarica come `<nome-progetto-slugificato>-mockup.png`.

## Import/export JSON

- Bottone "Esporta progetto": serializza il progetto attivo (`{ name, profile, posts, avatar }`) in JSON e lo scarica come `<nome-progetto-slugificato>.json`.
- Bottone "Importa progetto": apre un file input nascosto (`accept=".json"`), parsa il file, valida che contenga almeno `profile` e `posts` (array); se non valido, mostra un `alert()` di errore e interrompe.
- Se valido: `confirm()` con testo esplicito — OK = sovrascrive il progetto attivo, Annulla = crea un nuovo progetto con i dati importati (nome preso dal JSON, o "Progetto importato" se assente).

## Drag & drop riordino post

- Ambito: solo la manage list nella sidebar (non la griglia 3 colonne sul telefono).
- Ogni riga `.manage-post-item` diventa `draggable="true"`.
- Handler nativi `dragstart` (salva id trascinato), `dragover` (preventDefault, calcola posizione di inserimento), `drop` (riordina l'array `posts` spostando l'elemento trascinato alla nuova posizione).
- Dopo il drop: `saveData()` (persiste nel progetto attivo dentro `ig_projects`), `renderGrid()`, `renderManageList()`.
- Nessuna libreria esterna, nessun cambiamento all'interazione di tap-per-aprire già esistente sulla griglia.

## Fuori scope

- Impostazioni telefono per-progetto (restano globali, per decisione esplicita).
- Drag & drop direttamente sulla griglia 3 colonne del telefono.
- Editing dei progetti da modale/vista dedicata (solo dropdown + pulsanti icona).
- Undo/redo per operazioni sui progetti (eliminazione/sovrascrittura sono operazioni distruttive protette solo da `confirm()`, coerente con lo stile attuale dell'app).
