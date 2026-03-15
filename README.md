# Piano Alimentare Tracker

Piccola app locale con backend Python e database SQLite per associare ogni giorno del calendario alle opzioni del tuo piano alimentare.

## Avvio locale

Da `/Users/paolo/Documents/Playground`:

```bash
python3 server.py
```

Poi apri [http://localhost:8000](http://localhost:8000).

## Come funziona

- La vista principale e' settimanale.
- Trascina un'opzione dalla libreria pasti dentro il giorno desiderato.
- Ogni card aggiorna direttamente la sua sezione: colazione, spuntino mattina, pranzo, spuntino pomeriggio, cena.
- Ogni slot compilato ha un pulsante `Rimuovi`.
- I dati vengono salvati nel database SQLite locale [meal_tracker.db](/Users/paolo/Documents/Playground/meal_tracker.db) tramite il server Python.
- Ogni opzione nella libreria pasti mostra sulla destra quante volte e' stata usata nella settimana visibile.
