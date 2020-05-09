![Header Image](https://user-images.githubusercontent.com/19761338/81300952-b24baa80-9078-11ea-82b6-2d58b0632362.png)

# Mars Colonisation

Projekt im Rahmen von

**Frameworks, Dienste und Daten im Web (FDDW) – Prof. Dr. Kristian Fischer** \
Kurs im Schwerpunktmodul Web-Development \
Medieninformatik Ba. \
Sommersemester 2020

TH Köln, \
Campus Gummersbach

## Team

- [Finn Nils Gedrath](https://github.com/finnge)
- [Leonard Pelzer](https://github.com/leo-3108)

## Dokumentation

> Die NASA möchte daher eine geeignete Testimplementierung für webbasierte Systeme in einer Marsstation, welche die Kommunikation von der Erde zur Station, sowie innerhalb der Station erlaubt. Da die Station aus einzelnen Modulen besteht, die untereinander kommunizieren müssen, welche aber nicht zwangsweise über eine einheitliche Schnittstelle verfügen, soll eine übergeordnete und eventbasierte Architektur implementiert werden.

Eine Analyse des Problemraums und ein Modell der Architektur sind im [Wiki](https://github.com/leo-3108/mi-fddw-mars-colonisation-gedrath-pelzer/wiki).

## Testing

Bevor das System gestartet werden kann, müssen die `config.earth.json` und die `config.mars.json` mit den AMQP Zugangs-Daten befüllt werden. Auch müssen weitere Einstellungen befüllt werden.

Jede Komponente von den anderen unabhängig und muss einzelnd gestartet werden.

### Mars-Ecosystem
```bash
 $ npm run mars-ecosystem
```
Dies startet alle Scripte, die zur Weiterleitung und Verarbeitungen von Daten auf dem Mars benötigt werde.

**Alternativ** können hier für auch diese folgenden Scripte gestartet werden:

```bash
 $ npm run 
```

```bash
 $ npm run earth-interface
```

### Mars-Sensoren
Vordefinierte Sensoren:

```bash
 $ npm run mars-sensors
```

Temperatur-Sensor:

```bash
 $ npm run mars-sensor-temp {roomName}
```

### Earth-Ecosystem
```bash
 $ npm run earth-ecosystem
```
Dies startet alle Scripte, die zur Weiterleitung und Verarbeitungen von Daten auf der Erde benötigt werde.

**Alternativ** können hier für auch diese folgenden Scripte gestartet werden:

```bash
 $ npm run earth-interface
```

### Clients

Client auf dem Mars:
```bash
 $ npm run mars-client
```

Client auf der Erde:
```bash
 $ npm run earth-client
```

Jeder Client hat eine eindeutige 6 stellige ClientID, die zur Kommunikation verwendet wird.
