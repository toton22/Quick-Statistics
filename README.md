# Statistics for Managers

Course website for **DBS-PC-BR-601-T Business Research & Statistics** (MBA Semester I, DBS Global University, Dehradun).

The home page is the course concept map: four pillars (Descriptive, Probability, Inferential, Relationships), four topics each. Every box opens a page that goes from Basics to Theory to Application to Pro, with:

- the class slides and problem sheets, shown page by page exactly as handed out (download the originals too)
- worked solutions in exam layout (Given, Formula, Substitute, Result, Interpret) and the same method in Excel
- interactive explorers (sliders, drag-to-fit lines, a rotatable 3D regression plane)
- business use cases, a Pro section, common mistakes, and a five-question quick check

Around the map you'll find: three "Also in your syllabus" pages (Research foundations, Time series & forecasting, Advanced techniques), 25 solved practice questions per pillar, textbook case studies with Excel game plans, an end-term **Question Bank** (with a random 100-mark paper generator), a printable formula sheet, z/t/χ²/F tables, a glossary and a resources page.

Plain HTML, CSS and JavaScript. No frameworks, no build step needed to host it, nothing loaded from other websites (fonts, KaTeX and all scripts are included). Works offline once downloaded.

---

## Put it on GitHub Pages (about 10 minutes)

The site has a few hundred files (mostly the page images of the class slides), so the easiest way to upload is **GitHub Desktop**. The browser uploader also works, in batches of up to 100 files.

### Option A: GitHub Desktop (recommended)
1. On github.com, click **New repository**. Name it, for example, `Statistics`. Make it **Public**. Don't add a README. Click **Create repository**.
2. Install GitHub Desktop (desktop.github.com) and sign in.
3. **File › Clone repository**, pick `Statistics`, choose a folder on your computer.
4. Unzip this package and copy **everything inside it** (including the hidden `.nojekyll` file) into that folder, so `index.html` sits at the top level.
5. In GitHub Desktop, type a summary such as "First upload", click **Commit to main**, then **Push origin**.
6. On github.com, open the repository, go to **Settings › Pages**. Under *Build and deployment*, pick **Deploy from a branch**, branch **main**, folder **/ (root)**, and **Save**.
7. Wait a minute or two. Your site is live at `https://<your-username>.github.io/Statistics/`.

### Option B: upload in the browser
1. Create the repository as in step 1 above.
2. Click **uploading an existing file**. Drag in the top-level files first (`index.html`, the other `.html` files, `README.md`, `.nojekyll`).
3. Upload the `assets` folder, then each subfolder of `materials` (for example `materials/descriptive`), one batch at a time. GitHub accepts up to 100 files per batch. Keep the folder structure.
4. Turn on Pages as in step 6 above.

### Option C: command line
```bash
cd path/to/unzipped/site
git init && git add . && git commit -m "Statistics for Managers"
git branch -M main
git remote add origin https://github.com/<your-username>/Statistics.git
git push -u origin main
```
Then turn on Pages as in step 6.

---

## Folder map
```
index.html                 concept map (home)
descriptive.html …         4 pillar pages: overview, which-tool guide, all class files, case studies, 25 practice questions
central-tendency.html …    16 topic pages + research-foundations, time-series, advanced-techniques
question-bank.html         end-term question bank + model paper + random paper generator
formula-sheet.html  tables.html  glossary.html  case-studies.html  resources.html
assets/                    css, js (stats engine, explorers, viewer), fonts, KaTeX
materials/<pillar>/        your original class files (.pptx, .pdf, .xlsx) + pages/ images used by the viewer
```

## Notes for the instructor
- **Class files are unchanged.** Each PPT/PDF is shown through page images rendered from the original, and the original file is offered for download. PPTs were also saved as PDF for viewing.
- **Two files are not included** because they carry a Cengage notice that they "may not be scanned, copied or duplicated, or posted to a publicly accessible website": `Case Solution.pdf` (Consumer Research) and `Solutions.docx` (hypothesis test solutions, problems 15 onward). The site has its own worked solutions for those problems instead.
- **Textbook PDFs are not hosted** (copyright). Case studies are summarised in our own words with chapter and page references to Anderson et al. (12e) and Levine et al. (8e).
- Progress ticks ("Mark this topic complete", "Mark done") are saved in each student's own browser only.
- To change a page, edit the source fragment in `content/` from the source package and run `python3 build/build.py` (needs Python 3 with BeautifulSoup and Node.js for KaTeX).
