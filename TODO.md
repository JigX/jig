# JIG — Todo

## Kritiek / blocker

- [ ] **Wachtwoord werkt niet op staging** — admin account aanmaken in staging DB (zelfde werkwijze als productie: asyncpg script met $1 parameter)
- [ ] **Staging DNS propagatie** — wachten tot `jig-staging.indeweygerlings.com` via tunnel bereikbaar is; daarna testen of `/api/v1/connectors/` 401 geeft (verwacht gedrag)

---

## Frontend — pagina's bouwen

- [x] `/policies` pagina — lijst + nieuw beleid formulier
- [x] `/settings` pagina — taalwissel, accountinstellingen
- [x] `/audit` pagina — auditlog tabel
- [ ] Dashboard stats koppelen aan echte data (nu hardcoded 0 voor High Risk)

---

## Frontend — UX / vertalingen

- [ ] **Alle pagina-titels en subtitels invullen** — pagina's tonen nu soms de namespace-key als fallback (`connectors.new.title` etc.) omdat i18n namespace dot-notatie nu gefixed is maar nog gecontroleerd moet worden
- [ ] **Leesbare veldlabels in formulieren** — `fields.name`, `fields.host` etc. zijn inmiddels vertaald maar doorloop alle formulieren en controleer of alles klopt in NL én EN
- [ ] **Engelstalige placeholders** — alle placeholder-teksten controleren op leesbaarheid (bijv. `namePlaceholder`, `hostPlaceholder`)
- [ ] Connector detail pagina — `description` en `updated_at` toevoegen aan backend response
- [x] Connector type labels in tabel leesbaar maken (`REST / OpenAPI`, `MCP Server` etc.)

---

## Backend

- [ ] `GET /connectors/{id}` — `description` en `updated_at` toevoegen aan response
- [ ] `/register` endpoint afsluiten na eerste gebruiker
- [ ] Admin settings GET/PUT `/api/v1/admin/settings` koppelen aan frontend admin-auth pagina
- [ ] Analyseer-pipeline testen (SSH connector toevoegen → background task → status `ready`)

---

## CI/CD & Infra

- [ ] **Staging admin account aanmaken** — zodra staging backend bereikbaar is
- [ ] Staging → productie promotie flow testen (merge develop → main, wachten op Flux)
- [ ] Flux ImageUpdateAutomation testen — na fix `secretRef` verwijderd; controleren of Flux automatisch commits maakt bij nieuwe image tags
- [ ] `INTERNAL_API_URL` in staging frontend pod — controleren of Next.js standalone dit runtime leest of dat het baked-in is bij build; zo nee dan build-arg toevoegen aan frontend CI

---

## Later / nice-to-have

- [ ] **Groepen / granulaire rechten** — nu is het `is_admin: bool` (admin vs viewer). Groepen met specifieke permissions (bijv. connector-beheer, policy-beheer, read-only) vereist: `Group` model, user-group koppeltabel, permission checks per endpoint. Doen zodra duidelijk is welke rollen CRV-collega's nodig hebben.



- [ ] Language switcher in `/settings` koppelen (backend `locale` preference opslaan)
- [ ] Azure AD / Authentik SSO koppelen (admin → auth pagina)
- [ ] DB connector type toevoegen
- [ ] REST/OpenAPI connector type formulier bouwen
- [ ] MCP connector type formulier bouwen
- [ ] Gebruikersbeheer (uitnodigen, rol wijzigen) werkend maken
