let itaWords = [];

async function getItaWords() {
    const url = "https://raw.githubusercontent.com/vbvss199/Language-Learning-decks/refs/heads/main/italian/italian.json";

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
        }

        const result = await response.json();

        for (let i in result) {
            itaWords.push(result[i].word);
        }

        console.log(itaWords);

    } catch (error) {
        console.error(error);
    }
}