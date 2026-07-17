fetch("https://api.tempmail.lol/auth/1voeczlpzqje9wp6w9t101gr90tu7rlnti9v21")
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));
