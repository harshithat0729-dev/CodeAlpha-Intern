/**
 * image-gallery/js/data.js
 * ------------------------------------------------------------------
 * Static collection catalogue for the gallery.
 *
 * Each category groups a set of photos. A photo is described by:
 *   title   - display name shown on the card and in the modal
 *   query   - search phrase sent to the Wikimedia Commons image API
 *   desc    - short, human written description shown in the modal
 *
 * To add a new photo just append a [title, query, desc] tuple to the
 * matching category, or add a brand new category object.
 * ------------------------------------------------------------------
 */
const GALLERY_COLLECTIONS = [
  {
    category: "Landmarks",
    items: [
      ["Taj Mahal", "Taj Mahal Agra India", "Located in Agra, Uttar Pradesh, it is a stunning white marble mausoleum built by Mughal Emperor Shah Jahan."],
      ["Red Fort", "Red Fort Delhi India", "Historic fortification in Old Delhi that served as the main residence of the Mughal Emperors."],
      ["India Gate", "India Gate New Delhi India", "A war memorial located astride the Rajpath on the eastern edge of the ceremonial axis of New Delhi."],
      ["Qutub Minar", "Qutub Minar Delhi India", "A 73-meter high victory tower built in Delhi in 1193 by Qutb-ud-din Aibak."]
    ]
  },
  {
    category: "Nature",
    items: [
      ["Kerala Backwaters", "Kerala backwaters India", "A network of brackish lagoons and lakes lying parallel to the Arabian Sea coast in Kerala."],
      ["Himalayas", "Himalayas mountain range", "The majestic mountain range in Asia separating the plains of the Indian subcontinent from the Tibetan Plateau."],
      ["Valley of Flowers", "Alpine flowers Valley of Flowers Uttarakhand", "A vibrant national park in Uttarakhand featuring blooming alpine flowers, meadows, and rare endemic flora."],
      ["Western Ghats", "Western Ghats landscape India", "A mountain range running parallel to the western coast of the Indian peninsula, known for rich biodiversity."]
    ]
  },
  {
    category: "Festivals",
    items: [
      ["Diwali Celebration", "Diwali festival India lights", "The Hindu festival of lights signifying the victory of light over darkness and good over evil."],
      ["Holi Festival", "Holi festival India colours", "A popular ancient Hindu festival, also known as the Festival of Love and Colours."],
      ["Durga Puja", "Durga Puja Kolkata India", "An annual Hindu festival originating in West Bengal celebrating goddess Durga and her victory over Mahishasura."],
      ["Ganesh Chaturthi", "Ganesh Chaturthi India festival", "A vibrant Hindu festival celebrating the arrival of Lord Ganesha to earth from Kailash with his mother."]
    ]
  },
  {
    category: "Food",
    items: [
      ["Hyderabadi Biryani", "Hyderabadi biryani India", "A world-famous aromatic rice dish originating from Hyderabad, blending fragrant basmati rice with spiced meat."],
      ["Masala Dosa", "Masala dosa South India", "A crispy fermented crepe made from rice batter and black lentils, stuffed with spiced mashed potatoes."],
      ["Indian Thali", "Indian thali traditional food", "A platter consisting of various dishes representing a balanced and wholesome traditional Indian meal."],
      ["Panipuri", "Pani puri snack India", "A beloved Indian street snack consisting of a round hollow crisp puri filled with flavored water and tamarind chutney."]
    ]
  },
  {
    category: "Architecture",
    items: [
      ["Hawa Mahal", "Hawa Mahal Jaipur India", "A palace in Jaipur built from red and pink sandstone, famous for its unique honeycomb facade of 953 windows."],
      ["Mysore Palace", "Mysore Palace Karnataka India", "A historical palace and the official residence of the Wadiyar dynasty in Mysore, Karnataka."],
      ["Golden Temple", "Golden Temple Amritsar India", "The holiest gurdwara of Sikhism located in the city of Amritsar, Punjab, featuring stunning gold plating."],
      ["Meenakshi Temple", "Meenakshi Temple Madurai India", "A historic Hindu temple located on the southern bank of the Vaigai River in Madurai, Tamil Nadu."]
    ]
  },
  {
    category: "Wildlife",
    items: [
      ["Bengal Tiger", "Bengal tiger India wildlife", "A majestic tiger population found primarily in India and Bangladesh, known for its fierce beauty."],
      ["Indian Elephant", "Asian elephant India wildlife", "A magnificent pachyderm native to mainland Asia, deeply revered in Indian culture and heritage."],
      ["Indian Peacock", "Indian peacock national bird", "The national bird of India, celebrated for its gorgeous, colorful fan-like iridescent tail feathers."],
      ["Asiatic Lion", "Asiatic lion Gir India", "A lion subspecies that survives today only in Gujarat's Gir National Park and Wildlife Sanctuary."]
    ]
  },
  {
    category: "Beaches",
    items: [
      ["Goa Beach", "Goa beach India", "Famous coastal destination along the Arabian Sea known for lively shores, golden sands, and vibrant culture."],
      ["Marina Beach", "Marina Beach Chennai India", "A natural urban beach along the Bay of Bengal in Chennai, one of the longest natural urban beaches in the world."],
      ["Varkala Beach", "Varkala beach Kerala India", "A scenic beach in Kerala famous for its unique and picturesque laterite cliffs bordering the Arabian Sea."],
      ["Andaman Islands", "Andaman Islands beach India", "An archipelago in the Bay of Bengal known for crystal-clear turquoise waters and pristine white beaches."]
    ]
  },
  {
    category: "Culture",
    items: [
      ["Bharatanatyam", "Bharatanatyam classical dance India", "A major Indian classical dance form that originated in the temples of Tamil Nadu."],
      ["Kathakali", "Kathakali dance Kerala India", "A major form of classical Indian dance-drama known for its attractive make-up, elaborate costumes, and face masks."],
      ["Indian Classical Music", "Indian classical music performance", "Traditional music of the Indian subcontinent encompassing rich melodic structures like ragas."],
      ["Traditional Indian Art", "Madhubani painting folk art India", "A traditional style of folk painting practiced in the Mithila region of Bihar and Nepal."]
    ]
  }
];
