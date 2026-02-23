const deckId = "2gwjundl6apv"

function main(){
    drawCard();
    const btn = document.querySelector("#button");
    btn.addEventListener("click", drawCard);
}

async function drawCard(){
    const responce = await fetch(
        `https://deckofcardsapi.com/api/deck/${deckId}/draw/?count=2`
    );
    const jsonData = await responce.json();
    const cardLink = jsonData.cards[0].images.png;
    document.querySelector("#cardImage").src = cardLink;
    console.log(jsonData);
}

window.addEventListener("load", main)