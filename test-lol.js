fetch("https://api.tempmail.lol/generate")
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));
