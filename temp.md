Ora dai il prompt di guardare le modifiche che ho fatto e di lavorare per implementare l'assegnazione di task list e progetti a degli utenti assegnandogli vari un sistema di permessi all'interno di un progetto la modalità elenco che mi fa una lista di tutti i task presenti dentro un progetto, dove ci sta anche sopra un input che quando scrivo qualcosa e invio crea un task e accanto a ogni task ci sta un checkmark per assegnarli come completati, la sezione Gantt, la tabella che mostra i vari task su una tabella con colonne con numero del task (#1 #2 #3 etc), completato che se è completato mostra true e accanto data e ora del completamento, titolo etichette, assegnatari e data di scadenza. (queste tabelle avranno un simbolo filtro che potrai filtrare inserendo una query con questi parametri: Per filtrare le attività, è possibile utilizzare una sintassi di query simile a SQL. I campi disponibili per il filtraggio sono:

    done: Indica se l'attività è completata o meno
    priority: Livello di priorità dell'attività (1-5)
    percentDone: Percentuale di completamento dell'attività (0-100)
    dueDate: Data di scadenza dell'attività
    startDate: Data di inizio dell'attività
    endDate: Data di fine dell'attività
    doneAt: Data e ora in cui l'attività è stata completata
    assignees: Assegnatari dell'attività
    labels: Etichette associate all'attività
    project: Il progetto a cui appartiene l'attività (disponibile solo per i filtri salvati, non a livello di progetto)
    reminders: I promemoria dell'attività, restituiranno tutte le attività con almeno un promemoria corrispondente alla data della query
    created: Data e ora in cui l'attività è stata creata
    updated: Data e ora in cui l'attività è stata modificata l'ultima volta

Puoi applicare operazioni alle date per impostare date relative. Clicca sul valore della data in una query per ulteriori informazioni.

Gli operatori disponibili per il filtraggio sono:

    !=: Diverso da
    =: Uguale a
    >: Maggiore di
    >=: Maggiore o uguale a
    <: Minore di
    <=: Minore o uguale a
    like: Corrisponde a un modello (utilizzando wildcard %).
    in: Corrisponde a qualsiasi valore in un elenco di valori separati da virgola
    not in: Corrisponde a qualsiasi valore non presente in un elenco di valori separati da virgola

Per combinare più condizioni, puoi utilizzare i seguenti operatori logici:

    &&: L'operatore AND restituisce vero se tutte le condizioni sono soddisfatte
    ||: L'operatore OR restituisce vero se almeno una delle condizioni è soddisfatta
    ( and ): Parentesi per condizioni di raggruppamento

Ecco alcuni esempi di query di filtraggio:

    priority = 4: Corrisponde alle attività con il livello di priorità 4
    dueDate < now: Corrisponde alle attività con una data di scadenza nel passato
    done = false && priority >= 3: Corrisponde alle attività non completate con il livello di priorità 3 o superiore
    assignees in user1, user2: Corrisponde alle attività assegnate a "user1" o "user2"
    (priority = 1 || priority = 2) && dueDate <= now: Corrisponde alle attività con il livello di priorità 1 o 2 e una data di scadenza nel passato.


ed infine implementa la kanbann dove posso creare varie categorie a mio piacimento (i task devono essere drag and drop che posso spostare dove mi pare