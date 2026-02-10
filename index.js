import express from 'express';
import cors from 'cors';
import Pokemon from './schema/pokemon.js';
import './connect.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/assets', express.static('assets'));

// Route d'accueil
app.get('/', (req, res) => {
  res.send('This is the Pokemon Groupe 1 Backend!');
});

// GET - Liste des pokemons avec pagination (20 par 20)
// Query params: ?page=1&limit=20
app.get('/pokemon', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const total = await Pokemon.countDocuments();
    const pokemons = await Pokemon.find({})
      .sort({ id: 1 })
      .skip(skip)
      .limit(limit);

    res.json({
      pokemons,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET - Rechercher un pokemon par nom
// Query params: ?name=bulba
app.get('/pokemon/search', async (req, res) => {
  try {
    const { name } = req.query;
    if (!name) {
      return res.status(400).json({ error: 'Le paramètre "name" est requis' });
    }

    const pokemons = await Pokemon.find({
      $or: [
        { 'name.english': { $regex: name, $options: 'i' } },
        { 'name.french': { $regex: name, $options: 'i' } },
        { 'name.japanese': { $regex: name, $options: 'i' } },
        { 'name.chinese': { $regex: name, $options: 'i' } },
      ],
    });

    res.json(pokemons);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET - Filtrer les pokemons par type et stats
// Query params: ?types=Fire,Water&minHP=50&maxAttack=100&page=1&limit=20
app.get('/pokemon/filter', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = {};

    if (req.query.types) {
      const types = req.query.types.split(',');
      filter.type = { $in: types };
    }

    const statFields = ['HP', 'Attack', 'Defense', 'SpecialAttack', 'SpecialDefense', 'Speed'];
    for (const stat of statFields) {
      const minVal = req.query[`min${stat}`];
      const maxVal = req.query[`max${stat}`];
      if (minVal !== undefined || maxVal !== undefined) {
        const key = `base.${stat}`;
        filter[key] = {};
        if (minVal !== undefined) filter[key].$gte = Number(minVal);
        if (maxVal !== undefined) filter[key].$lte = Number(maxVal);
      }
    }

    const total = await Pokemon.countDocuments(filter);
    const pokemons = await Pokemon.find(filter)
      .sort({ id: 1 })
      .skip(skip)
      .limit(limit);

    res.json({
      pokemons,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET - Récupérer plusieurs pokemons par leurs IDs
// Query params: ?ids=1,4,7
app.get('/pokemon/by-ids', async (req, res) => {
  try {
    const { ids } = req.query;
    if (!ids) {
      return res.status(400).json({ error: 'Le paramètre "ids" est requis' });
    }

    const idList = ids.split(',').map(Number).filter(n => !isNaN(n));
    const pokemons = await Pokemon.find({ id: { $in: idList } }).sort({ id: 1 });
    res.json(pokemons);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET - Liste minimale de tous les pokemons (id, name.english, type, image)
app.get('/pokemon/list-all', async (req, res) => {
  try {
    const pokemons = await Pokemon.find({})
      .select('id name.english type image')
      .sort({ id: 1 });
    res.json(pokemons);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET - Récupérer un pokemon par son ID
app.get('/pokemon/:id', async (req, res) => {
  try {
    const poke = await Pokemon.findOne({ id: req.params.id });
    if (poke) {
      res.json(poke);
    } else {
      res.status(404).json({ error: 'Pokemon non trouvé' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST - Créer un nouveau pokemon
app.post('/pokemon', async (req, res) => {
  try {
    const { name, type, base, image } = req.body;

    // Générer un nouvel ID (max existant + 1)
    const lastPokemon = await Pokemon.findOne({}).sort({ id: -1 });
    const newId = lastPokemon ? lastPokemon.id + 1 : 1;

    const newPokemon = new Pokemon({
      id: newId,
      name,
      type,
      base,
      image: image || `http://localhost:3000/assets/pokemons/${newId}.png`,
    });

    const saved = await newPokemon.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PUT - Modifier un pokemon
app.put('/pokemon/:id', async (req, res) => {
  try {
    const updated = await Pokemon.findOneAndUpdate(
      { id: req.params.id },
      req.body,
      { new: true, runValidators: true }
    );

    if (updated) {
      res.json(updated);
    } else {
      res.status(404).json({ error: 'Pokemon non trouvé' });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE - Supprimer un pokemon
app.delete('/pokemon/:id', async (req, res) => {
  try {
    const deleted = await Pokemon.findOneAndDelete({ id: req.params.id });

    if (deleted) {
      res.json({ message: 'Pokemon supprimé', pokemon: deleted });
    } else {
      res.status(404).json({ error: 'Pokemon non trouvé' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Démarrage du serveur
app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
