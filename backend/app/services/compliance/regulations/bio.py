BIO_CONTEXT = """
BIO (Baseline Informatiebeveiliging Overheid):
Verplicht voor alle overheidsorganisaties en toegepast door semi-publieke organisaties.
Gebaseerd op ISO 27001/27002. CRV valt als uitvoeringsorganisatie onder BIO.

Relevante controls:

BIO 6.1 — Toegangsbeheer:
- Least privilege: gebruikers krijgen minimaal benodigde rechten
- Functiescheiding: productie en beheer moeten gescheiden zijn
- Regelmatige review van toegangsrechten

BIO 9.4 — Toegangsbeheer systeem- en toepassingsgegevens:
- Wachtwoordbeleid, MFA voor beheertoegang
- Sessie time-outs

BIO 10.1 — Cryptografie:
- Encryptie van data in transit (TLS 1.2+)
- Encryptie van gevoelige data at rest

BIO 10.5 — Logging en monitoring:
- Alle beheertoegang moet worden gelogd
- Logs moeten integer zijn en niet te verwijderen door beheerders
- Minimale bewaartermijn logs: 1 jaar

BIO 12.1 — Beheer van informatieverwerkende faciliteiten:
- Wijzigingsbeheer (change management) verplicht voor productiesystemen
- Scheiding van omgevingen (dev/test/prod)

BIO 13 — Communicatiebeveiliging:
- Beveiligde protocollen voor datatransport
- Netwerksegmentatie

Waarschuwingssignalen voor BIO-risico:
- Capabilities die directe productietoegang geven zonder change management
- Ontbrekende of te korte auditlogging
- Toegang zonder MFA tot beheeromgevingen
- Capabilities die logging kunnen uitschakelen of verwijderen
- Directe databasetoegang zonder applicatielaag
"""
