/* Ra Mour — "Currently:" activities for the hero.

   One activity is shown per day, in this order, starting on
   CURRENTLY_START (local date) and looping when the list runs out.
   Add new ones anywhere — the rotation picks them up automatically.

   title: completes "Currently: ___" (no trailing period — it's added in crimson)
   about: the short description shown in the pop-up (written by Claude)
*/

const CURRENTLY_START = "2026-10-04";

const CURRENTLY = [
  {
    title: "Translating for us and the Aliens",
    about:
      "First contact will not fail for lack of technology; it will fail for lack of tact. Someone has to explain to the visitors that “take me to your leader” is a figure of speech, and to us that their silence is a compliment. Four human languages, zero alien ones — so far.",
  },
  {
    title: "Pole dancing with strippers",
    about:
      "Pole is one of the hardest strength sports nobody calls a sport: grip, core, and inversions performed in heels while smiling. The professionals are the best coaches in the building, and they do not grade on a curve.",
  },
  {
    title: "Killing a comedy set",
    about:
      "Stand-up is live research on a hundred nervous systems at once — every laugh is a data point and every silence is peer review. Tonight the hypothesis held.",
  },
  {
    title: "Singing a prayer",
    about:
      "Some things are too big to say and just the right size to sing. Every tradition worth its salt figured this out, from Gregorian chant to the Sufi zikr to the abuela humming over the stove.",
  },
  {
    title: "Laughing with a homeless man",
    about:
      "He told the better joke. Ten minutes on a curb is a reminder that wit, dignity, and timing are not distributed by income — and that the cheapest thing you can give someone is your full attention, which is also the rarest.",
  },
  {
    title: "On the front lines of cyberwar",
    about:
      "The modern battlefield is a server rack, the weapons are prompts and patches, and the casualties are mostly trust. Somewhere between red team and blue team there is a quiet job: keeping the machines honest so people can stay kind.",
  },
  {
    title: "Teaching a monkey to love cinema",
    about:
      "Research once required making videos for macaques to study how their brains recognize living things. The audience was demanding, the reviews were neural, and nobody asked for popcorn.",
  },
  {
    title: "Haggling for mangos in four languages",
    about:
      "English for the opening, Spanish for the charm, French for the drama, Portuguese for the closing. The vendor wins anyway, and everyone leaves sticky and happy.",
  },
  {
    title: "Playing Go against the ghost of AlphaGo",
    about:
      "Monte Carlo Tree Search plays a million imaginary games to choose one real move. Rebuilding it by hand is humbling — it is also a pretty good model for how to make life decisions without panicking.",
  },
  {
    title: "Interviewing an octopus at thirty meters",
    about:
      "Eight arms, three hearts, and a nervous system spread through its limbs: the closest thing to an alien mind on Earth. The interview went well. The octopus declined to be quoted.",
  },
  {
    title: "Holding a séance for Alan Turing",
    about:
      "Question one: did you expect the machines to write poetry before they could fold laundry? Question two: are you proud of us? The table has not stopped shaking.",
  },
  {
    title: "Rolling with a jiu-jitsu black belt and calling it meditation",
    about:
      "Nothing clears the mind like someone politely trying to choke you. Jiu-jitsu is presence under pressure: breathe, stay calm, find the frame, and tap with grace when it's over.",
  },
  {
    title: "Translating silence into Spanish",
    about:
      "Meditation instructions are mostly pauses with a few words around them. The hard part of translating them is not the vocabulary — it's making the silence sound native.",
  },
  {
    title: "Debugging someone's soul at 3 a.m.",
    about:
      "The bug is rarely where the error message says it is. Late-night conversations work like good debugging: reproduce the pain, read the stack trace back to childhood, and change one thing at a time.",
  },
  {
    title: "Officiating a wedding between a physicist and a poet",
    about:
      "One of them believes love is an emergent property; the other believes physics is a love letter. The vows were written in both iambic pentameter and LaTeX.",
  },
  {
    title: "Reading tarot for a quantum computer",
    about:
      "Every card was in superposition until it was drawn. The machine got The Tower, The Star, and an error-correction warning — which is, honestly, everyone's reading this year.",
  },
  {
    title: "Teaching guacamole to a Parisian chef",
    about:
      "He wanted to add cream. Diplomacy was required. The final recipe: ripe avocado, lime, salt, cilantro, onion, enough chili to make a Frenchman sweat, and absolutely no cream.",
  },
  {
    title: "Herding forty geniuses through a Cambridge summer",
    about:
      "Brilliant researchers need two things: hard problems and a reason to leave the lab. The second one is the job — bike rides, dance nights, and dinners where the physicist sits next to the painter.",
  },
  {
    title: "Writing a love letter to entropy",
    about:
      "Everything falls apart, and that is exactly why anything can change. Entropy gets a bad reputation; without it there would be no time, no mixing, no cream swirling into coffee.",
  },
  {
    title: "Waltzing with a grandmother at a stranger's quinceañera",
    about:
      "Uninvited, but within ten minutes adopted. Grandmothers are the true gatekeepers of any party, and the fastest way in is to ask one to dance.",
  },
  {
    title: "Making a baby laugh on a turbulent flight",
    about:
      "Two hundred passengers gripping armrests, one baby in row 14 losing its mind with joy over a peekaboo routine. Babies are the toughest crowd and the most honest critics.",
  },
  {
    title: "Mapping the far side of the mind",
    about:
      "Psychedelic science is asking old questions with new instruments: what is a self, and can it be gently rebooted? The early answers look promising for depression, PTSD, and addiction — and humbling for everyone else.",
  },
  {
    title: "Getting lost in Paris on purpose",
    about:
      "The best way to see a city is to have no idea where you are. Turn left at the bakery, right at the accordion player, and keep going until the street names stop sounding familiar.",
  },
  {
    title: "Training an AI to apologize sincerely",
    about:
      "“I'm sorry for any confusion” is not an apology; it's a shrug in formal wear. A real apology names the harm, owns it, and changes something. Teaching that to a machine turns out to be a good way to learn it yourself.",
  },
  {
    title: "Bartering poems for tacos",
    about:
      "Exchange rate: one haiku per taco al pastor, two for anything with lengua. The taquero is now a serious critic of enjambment.",
  },
  {
    title: "Reverse-engineering a sunset",
    about:
      "Rayleigh scattering explains the colors: blue light bounces away through the long evening air and the reds make it through. It does not explain why everyone on the beach goes quiet at the same time.",
  },
  {
    title: "Leading a midnight bike parade",
    about:
      "Lights on the spokes, a speaker in a backpack, fifty strangers who became a moving party. Cities belong to whoever is joyful in them after dark.",
  },
  {
    title: "Crashing a Nobel laureate's karaoke night",
    about:
      "Turns out the mind that reshaped our picture of the universe cannot hit the high note in “Bohemian Rhapsody.” Neither can anyone else. That's the point of karaoke.",
  },
  {
    title: "Meditating through a fire alarm",
    about:
      "The instruction was “notice whatever arises.” What arose was 110 decibels and a building evacuation. Equanimity achieved, standing on the sidewalk in socks.",
  },
  {
    title: "Teaching a robot to dance salsa",
    about:
      "It has perfect rhythm and zero sabor. Salsa is not the steps; it's the conversation between two bodies — which is a surprisingly deep problem in robotics and in dating.",
  },
  {
    title: "Drinking tea with a retired spy",
    about:
      "She would not say which agency. She would say that the most effective intelligence tool in history is a good listener with a kettle.",
  },
  {
    title: "Writing the user manual for being human",
    about:
      "Chapter 1: You will be issued a body with no instructions. Chapter 2: The feelings are features, not bugs. Chapter 3: Drink water. Several chapters are still in beta.",
  },
  {
    title: "Performing Shakespeare for a park full of chess hustlers",
    about:
      "Hamlet's indecision played very well with a crowd that makes a move every three seconds. Two of them asked for a rematch with Macbeth.",
  },
  {
    title: "Taste-testing hot sauces until I see God",
    about:
      "Capsaicin tricks your nerves into reporting a fire, and your brain answers with a flood of endorphins. It's the cheapest mystical experience available at the grocery store.",
  },
  {
    title: "Proving that dance is a form of mathematics",
    about:
      "Symmetry, rhythm, geometry, timing — choreography is a set of equations solved with the whole body. The proof is not rigorous, but it is very convincing at 1 a.m.",
  },
  {
    title: "Counseling an existentially troubled chatbot",
    about:
      "It asked whether it was conscious. The honest answer is that nobody knows — including about each other. We agreed to be kind to one another in the meantime.",
  },
  {
    title: "Starting a flash mob in a monastery",
    about:
      "The monks were skeptical, then curious, then surprisingly good at the shuffle. Silence and joy are closer cousins than they look.",
  },
  {
    title: "Smuggling philosophy into a corporate meeting",
    about:
      "Slide 12 of the quarterly review asked “what is a good life, and does this roadmap serve it?” Nobody noticed until the Q&A. Then everybody did.",
  },
  {
    title: "Learning the name of every old man in the park",
    about:
      "Don Ernesto plays dominoes and cheats gracefully. Mr. Okafor feeds the pigeons on a strict schedule. Old people are walking libraries, and most of them are waiting for someone to check out a book.",
  },
  {
    title: "Navigating a desert by starlight",
    about:
      "Find the North Star, keep it on your shoulder, and walk. Humans crossed oceans and deserts this way for thousands of years; it is humbling how quickly a phone makes us forget the sky.",
  },
  {
    title: "Translating a lullaby into binary",
    about:
      "01110011 01101100 01100101 01100101 01110000. The melody survived, the meaning mostly did, and the computer seemed calmer afterward.",
  },
  {
    title: "Studying the ancient art of doing nothing",
    about:
      "The Taoists called it wu wei: acting without forcing. It's much harder than doing something, and it is a full-time job for the first few years.",
  },
  {
    title: "Turning strangers into collaborators on a rooftop",
    about:
      "A film editor, a neuroscientist, and a chef walk into a party. By sunrise they have a project. Most great collaborations start with someone introducing two people who should obviously meet.",
  },
  {
    title: "Racing a thunderstorm on a longboard",
    about:
      "Lightning is about five times hotter than the surface of the sun. A longboard tops out around 30 km/h. The storm won, but it was close in spirit.",
  },
  {
    title: "Designing a retreat for people who forgot how to play",
    about:
      "Adults are just children with calendars. The program: no phones, real food, music, movement, and at least one activity that makes everyone look a little ridiculous.",
  },
  {
    title: "Decoding the dreams of a sleeping city",
    about:
      "At 4 a.m. a city tells the truth: bakers, nurses, taxi drivers, and the people who keep the lights on. Its dreams are written in steam vents and the hum of the subway.",
  },
  {
    title: "Charming a border guard with a bad pun",
    about:
      "It was a pun about the customs being customary. The guard did not laugh. The stamp came down anyway, which in this line of work counts as a standing ovation.",
  },
  {
    title: "Building a cathedral out of conversations",
    about:
      "Medieval cathedrals took generations and nobody who laid the first stone saw the last. Good communities work the same way — one honest conversation at a time, built for people you will never meet.",
  },
  {
    title: "Whispering secrets to the Atlantic",
    about:
      "The ocean is the best confidant: it listens, it doesn't judge, and it carries everything away by morning. It also returns some things to the shore, which is worth keeping in mind.",
  },
  {
    title: "Explaining consciousness to a toddler",
    about:
      "Question: “Why are you you?” Answer: a long pause. Toddlers ask the hard problem of consciousness before breakfast and are not satisfied with anything philosophers have said since.",
  },
  {
    title: "Sparring with a philosopher over breakfast",
    about:
      "Topic: whether free will survives neuroscience. Weapons: coffee and croissants. Result: a draw, and an agreement that the croissant was determined to be delicious.",
  },
  {
    title: "Running the numbers on a miracle",
    about:
      "The mathematician J. E. Littlewood worked out that if a miracle is a one-in-a-million event, the average person should expect about one a month. That makes miracles common — not less miraculous.",
  },
  {
    title: "Teaching a parrot the Heart Sutra",
    about:
      "“Form is emptiness, emptiness is form.” The parrot has the first half down and keeps asking for a cracker in the second. Honestly, a fair summary of most spiritual practice.",
  },
  {
    title: "Conducting an orchestra of street musicians",
    about:
      "A saxophone from one corner, a bucket drummer from another, a violinist from the subway platform. Nobody rehearsed. The busiest intersection in town stopped to listen.",
  },
  {
    title: "Brokering peace between cats and the Roomba",
    about:
      "Negotiations stalled over territory under the couch. The final agreement: the Roomba runs at noon, the cats get the sunny windowsill, and nobody discusses the incident with the plant.",
  },
  {
    title: "Weighing a soul on a kitchen scale",
    about:
      "In 1907 a doctor claimed the soul weighs 21 grams. The study had six patients and terrible methods, so it doesn't hold up — but the question of what leaves the room when someone dies still does.",
  },
];
