[![Actions Status](https://github.com/irrisor/lernbox/workflows/build/badge.svg)](https://github.com/irrisor/lernbox/actions)

[Lernbox ausprobieren](https://lernbox.irrisor.net/)

[Lernbox bearbeiten](https://codesandbox.io/s/github/irrisor/lernbox/tree/master/)

Lehrer
 * Anlegen nur mit Adminpasswort
 * Name für ID
 * Passwort vergeben
 * Kann Lehrerdaten schreiben
 * Schüler anlegen
 
Schüler
 * Passwort nur von Lehrer änderbar
 * Kann Lehererkarten lesen
    * muss also "seinen" Lehrer kennen
    * muss andere Lehrer kennen, um deren Karten zu laden
 * speichert seinen Lernstand bei mehreren Lehrern (hat also auch mehrere eigene IDs)
 * Kann Schülerdaten schreiben

Dateistruktur
* /schul-id/
    * access.json
    * /lehrer-id/
        * access.json
        * cards.json
        * /pupil-id/
            * access.json
            * data.json
            
access.json
* Passworthash zum Schreiben
* Passworthash zum Lesen
    