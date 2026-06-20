NIS2_CONTEXT = """
NIS2-richtlijn (Network and Information Security Directive 2):
Van toepassing op essentiële en belangrijke entiteiten, waaronder organisaties in de landbouwsector
en digitale infrastructuur providers.

Artikel 21 — Beveiligingsmaatregelen (verplichte maatregelen):
- Risicoanalyse en informatiebeveiliging beleid
- Beheersing van incidenten
- Bedrijfscontinuïteit en back-up
- Beveiliging van de toeleveringsketen
- Beveiliging bij aankoop en ontwikkeling van netwerk- en informatiesystemen
- Beleid en procedures voor effectiviteitsbeoordeling (penetratietesten etc.)
- Basiscyberhygiëne en cybersecurity-trainingen
- Cryptografie en encryptie waar passend
- Beveiliging van personeel, toegangsbeleid en beheer van bedrijfsmiddelen
- Gebruik van multi-factor authenticatie (MFA)

Artikel 23 — Meldplicht:
- Significante incidenten moeten binnen 24 uur worden gemeld aan de toezichthouder
- Volledige melding binnen 72 uur

Waarschuwingssignalen voor NIS2-risico:
- Capabilities die netwerktoegang geven zonder MFA
- Remote execution zonder logging
- Toegang tot kritieke infrastructuurcomponenten
- Credentials of API-keys in plaintext parameters
- Bulk bestandsoperaties op productiesystemen
- SSH/RDP toegang zonder sessieopname
"""
