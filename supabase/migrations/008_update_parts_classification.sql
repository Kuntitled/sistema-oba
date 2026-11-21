-- ============================================================
-- Sistema OBA — Reclassificação Idempotente do Catálogo de Peças (008)
-- Gerado automaticamente por: scripts/generate-parts-seed.ts
-- Regras: preserva UUIDs existentes em parts_catalog, reclassifica tipos/linhas
--         e preenche flags de compatibilidade (BX, BXE, UX, UXE, CX, CXE).
-- ============================================================

-- ─── 1. Reclassificar part_type in-place preservando IDs já vinculados ───────
UPDATE public.parts_catalog p
SET
  part_type = 'main_blade',
  line = 'CX'
WHERE p.part_type = 'blade'
  AND p.name IN ('Brave', 'Arc', 'Dark', 'Reaper', 'Brush', 'Blast', 'Flame', 'Volt', 'Eclipse', 'Fang', 'Hunt', 'Might', 'Flare', 'Antlers', 'Fort', 'Wriggle')
  AND NOT EXISTS (
    SELECT 1 FROM public.parts_catalog p2
    WHERE p2.name = p.name AND p2.part_type = 'main_blade'
  );

UPDATE public.parts_catalog p
SET
  part_type = 'metal_blade',
  line = 'CXE'
WHERE p.part_type = 'blade'
  AND p.name IN ('Blitz', 'Fortress', 'Rage', 'Delta', 'Whip', 'Tread', 'Force', 'Hurricane')
  AND NOT EXISTS (
    SELECT 1 FROM public.parts_catalog p2
    WHERE p2.name = p.name AND p2.part_type = 'metal_blade'
  );

-- Operate e Turbo são Ratchets Compostas/Integradas (não Bits)
UPDATE public.parts_catalog p
SET
  part_type = 'ratchet',
  line = NULL,
  blocks_bit = true
WHERE p.part_type = 'bit'
  AND p.name IN ('Operate', 'Turbo')
  AND NOT EXISTS (
    SELECT 1 FROM public.parts_catalog p2
    WHERE p2.name = p.name AND p2.part_type = 'ratchet'
  );

-- ─── 2. Upsert idempotente de todas as 288 peças classificadas ─────────────
-- ─── BLADE (115 peças) ────────────────────────
INSERT INTO public.parts_catalog (name, aliases, part_type, line, is_simple_ratchet, requires_simple_ratchet, blocks_bit, is_active)
VALUES
  ('DranSword', ARRAY['Sword Dran']::TEXT[], 'blade', 'BX', false, false, false, true),
  ('HellsScythe', ARRAY['Scythe Incendio']::TEXT[], 'blade', 'BX', false, false, false, true),
  ('WizardArrow', ARRAY['Arrow Wizard']::TEXT[], 'blade', 'BX', false, false, false, true),
  ('KnightShield', ARRAY['Helm Knight']::TEXT[], 'blade', 'BX', false, false, false, true),
  ('DranzerSpiral', ARRAY['Dranzer Spiral']::TEXT[], 'blade', 'BX', false, false, false, true),
  ('KnightLance', ARRAY['Lance Knight']::TEXT[], 'blade', 'BX', false, false, false, true),
  ('SharkEdge', ARRAY['Keel Shark']::TEXT[], 'blade', 'BX', false, false, false, true),
  ('CobaltDrake', ARRAY['Cobalt Drake']::TEXT[], 'blade', 'BX', false, false, false, true),
  ('LeonClaw', ARRAY['Claw Leon']::TEXT[], 'blade', 'BX', false, false, false, true),
  ('ViperTail', ARRAY['Tail Viper']::TEXT[], 'blade', 'BX', false, false, false, true),
  ('RhinoHorn', ARRAY['Horn Rhino']::TEXT[], 'blade', 'BX', false, false, false, true),
  ('DranDagger', ARRAY['Dagger Dran']::TEXT[], 'blade', 'BX', false, false, false, true),
  ('HellsChain', ARRAY['Chain Incendio']::TEXT[], 'blade', 'BX', false, false, false, true),
  ('PhoenixFeather', ARRAY['Feather Phoenix']::TEXT[], 'blade', 'BX', false, false, false, true),
  ('PhoenixWing', ARRAY['Soar Phoenix']::TEXT[], 'blade', 'BX', false, false, false, true),
  ('WyvernGale', ARRAY['Gale Wyvern']::TEXT[], 'blade', 'BX', false, false, false, true),
  ('UnicornSting', ARRAY['Sting Unicorn']::TEXT[], 'blade', 'BX', false, false, false, true),
  ('SphinxCowl', ARRAY['Cowl Sphinx']::TEXT[], 'blade', 'BX', false, false, false, true),
  ('DranBuster', ARRAY['Buster Dran']::TEXT[], 'blade', 'UX', false, false, false, true),
  ('HellsHammer', ARRAY['Hammer Incendio']::TEXT[], 'blade', 'UX', false, false, false, true),
  ('WizardRod', ARRAY['Wand Wizard']::TEXT[], 'blade', 'UX', false, false, false, true),
  ('DrigerSlash', ARRAY['Driger Slash']::TEXT[], 'blade', 'BX', false, false, false, true),
  ('TyrannoBeat', ARRAY['Beat Tyranno']::TEXT[], 'blade', 'BX', false, false, false, true),
  ('ShinobiShadow', ARRAY['Shadow Shinobi']::TEXT[], 'blade', 'UX', false, false, false, true),
  ('WeissTiger', ARRAY['Pearl Tiger']::TEXT[], 'blade', 'BX', false, false, false, true),
  ('CobaltDragoon', ARRAY['Cobalt Dragoon']::TEXT[], 'blade', 'BX', false, false, false, true),
  ('BlackShell', ARRAY['Obsidian Shell']::TEXT[], 'blade', 'BX', false, false, false, true),
  ('AeroPegasus', ARRAY[]::TEXT[], 'blade', 'UX', false, false, false, true),
  ('LeonCrest', ARRAY['Crest Leon']::TEXT[], 'blade', 'UX', false, false, false, true),
  ('PhoenixRudder', ARRAY['Rudder Phoenix']::TEXT[], 'blade', 'UX', false, false, false, true),
  ('WhaleWave', ARRAY['Tide Whale']::TEXT[], 'blade', 'BX', false, false, false, true),
  ('Lightning L-Drago (Upper Mode)', ARRAY[]::TEXT[], 'blade', 'BX', false, false, false, true),
  ('Lightning L-Drago (Rapid Hit Mode)', ARRAY[]::TEXT[], 'blade', 'BX', false, false, false, true),
  ('BearScratch', ARRAY['Savage Bear']::TEXT[], 'blade', 'BX', false, false, false, true),
  ('SilverWolf', ARRAY['Sterling Wolf']::TEXT[], 'blade', 'UX', false, false, false, true),
  ('CrimsonGaruda', ARRAY['Scarlet Garuda']::TEXT[], 'blade', 'BX', false, false, false, true),
  ('SamuraiSaber', ARRAY['Saber Samurai']::TEXT[], 'blade', 'UX', false, false, false, true),
  ('KnightMail', ARRAY['Mail Knight']::TEXT[], 'blade', 'UX', false, false, false, true),
  ('PteraSwing', ARRAY['Talon Ptera']::TEXT[], 'blade', 'BX', false, false, false, true),
  ('ShinobiKnife', ARRAY['Knife Shinobi']::TEXT[], 'blade', 'BX', false, false, false, true),
  ('ImpactDrake', ARRAY['Impact Drake']::TEXT[], 'blade', 'UX', false, false, false, true),
  ('GhostCircle', ARRAY['Circle Ghost']::TEXT[], 'blade', 'UX', false, false, false, true),
  ('DracielShield', ARRAY['Draciel Shield']::TEXT[], 'blade', 'BX', false, false, false, true),
  ('MammothTusk', ARRAY['Tusk Mammoth']::TEXT[], 'blade', 'BX', false, false, false, true),
  ('GolemRock', ARRAY['Rock Golem']::TEXT[], 'blade', 'UX', false, false, false, true),
  ('CrocoCrunch', ARRAY['Bite Croc']::TEXT[], 'blade', 'BX', false, false, false, true),
  ('ShelterDrake', ARRAY['Shelter Drake']::TEXT[], 'blade', 'BX', false, false, false, true),
  ('DragoonStorm', ARRAY[]::TEXT[], 'blade', 'BX', false, false, false, true),
  ('StormPegasis', ARRAY[]::TEXT[], 'blade', 'BX', false, false, false, true),
  ('VictoryValkyrie', ARRAY[]::TEXT[], 'blade', 'BX', false, false, false, true),
  ('XenoXcalibur', ARRAY[]::TEXT[], 'blade', 'BX', false, false, false, true),
  ('ScorpioSpear', ARRAY['Spear Scorpio']::TEXT[], 'blade', 'UX', false, false, false, true),
  ('SamuraiSteel', ARRAY['Steel Samurai']::TEXT[], 'blade', 'BX', false, false, false, true),
  ('Iron Man', ARRAY[]::TEXT[], 'blade', 'BX', false, false, false, true),
  ('Thanos', ARRAY[]::TEXT[], 'blade', 'BX', false, false, false, true),
  ('Spider-Man', ARRAY[]::TEXT[], 'blade', 'BX', false, false, false, true),
  ('Venom', ARRAY[]::TEXT[], 'blade', 'BX', false, false, false, true),
  ('Luke Skywalker', ARRAY[]::TEXT[], 'blade', 'BX', false, false, false, true),
  ('Darth Vader', ARRAY[]::TEXT[], 'blade', 'BX', false, false, false, true),
  ('The Mandalorian', ARRAY['The Mandolorian']::TEXT[], 'blade', 'BX', false, false, false, true),
  ('Moff Gideon', ARRAY[]::TEXT[], 'blade', 'BX', false, false, false, true),
  ('TriceraPress', ARRAY['Brace Triceratops']::TEXT[], 'blade', 'BX', false, false, false, true),
  ('Rock Leone', ARRAY[]::TEXT[], 'blade', 'BX', false, false, false, true),
  ('Mosasaurus', ARRAY['Mosasaurus/Ridge Triceratops', 'Ridge Triceratops']::TEXT[], 'blade', 'BX', false, false, false, true),
  ('Optimus Prime', ARRAY[]::TEXT[], 'blade', 'BX', false, false, false, true),
  ('Megatron', ARRAY[]::TEXT[], 'blade', 'BX', false, false, false, true),
  ('Optimus Primal', ARRAY[]::TEXT[], 'blade', 'BX', false, false, false, true),
  ('Starscream', ARRAY[]::TEXT[], 'blade', 'BX', false, false, false, true),
  ('SharkScale', ARRAY['Scale Shark']::TEXT[], 'blade', 'UX', false, false, false, true),
  ('TyrannoRoar', ARRAY['Roar Tyranno']::TEXT[], 'blade', 'BX', false, false, false, true),
  ('SamuraiCalibur', ARRAY['Calibur Samurai']::TEXT[], 'blade', 'BX', false, false, false, true),
  ('GoatTackle', ARRAY['Tackle Goat']::TEXT[], 'blade', 'BX', false, false, false, true),
  ('ClockMirage', ARRAY['Mirage Clock']::TEXT[], 'blade', 'UX', false, true, false, true),
  ('WyvernHover', ARRAY['Hover Wyvern']::TEXT[], 'blade', 'UX', false, false, false, true),
  ('SharkGill', ARRAY['Gill Shark']::TEXT[], 'blade', 'BX', false, false, false, true),
  ('OrochiCluster', ARRAY['Coil Orochi']::TEXT[], 'blade', 'UX', false, false, false, true),
  ('MeteorDragoon', ARRAY['Meteoroid Dragoon']::TEXT[], 'blade', 'UX', false, false, false, true),
  ('MummyCurse', ARRAY['Curse Mummy']::TEXT[], 'blade', 'UX', false, false, false, true),
  ('Storm Spriggan', ARRAY[]::TEXT[], 'blade', 'BX', false, false, false, true),
  ('BulletGriffon', ARRAY['Rocket Griffon']::TEXT[], 'blade', 'UXE', false, false, false, true),
  ('Red Hulk', ARRAY[]::TEXT[], 'blade', 'BX', false, false, false, true),
  ('Captain America', ARRAY[]::TEXT[], 'blade', 'BX', false, false, false, true),
  ('DranStrike', ARRAY['Strike Dran']::TEXT[], 'blade', 'BXE', false, false, false, true),
  ('HeavensRing', ARRAY['Ring Aether']::TEXT[], 'blade', 'BXE', false, false, false, true),
  ('GloryValkyrie', ARRAY['Glory Valkyrie']::TEXT[], 'blade', 'UXE', false, false, false, true),
  ('HellsNether', ARRAY['Nether Incendio']::TEXT[], 'blade', 'UXE', false, false, false, true),
  ('DranSword v2', ARRAY[]::TEXT[], 'blade', 'BX', false, false, false, true),
  ('LusterDragoon', ARRAY[]::TEXT[], 'blade', 'BXE', false, false, false, true),
  ('WizardArrow v2', ARRAY[]::TEXT[], 'blade', 'BX', false, false, false, true),
  ('KnightShield v2', ARRAY[]::TEXT[], 'blade', 'BX', false, false, false, true),
  ('ValorBison', ARRAY['Valor Bison']::TEXT[], 'blade', 'UXE', false, false, false, true),
  ('HellsScythe v2', ARRAY[]::TEXT[], 'blade', 'BX', false, false, false, true),
  ('SiegSuperion', ARRAY['Supress Superion']::TEXT[], 'blade', 'BXE', false, false, false, true),
  ('Yell Kong', ARRAY[]::TEXT[], 'blade', 'BX', false, false, false, true),
  ('Obi-Wan Kenobi', ARRAY[]::TEXT[], 'blade', 'BX', false, false, false, true),
  ('General Grievous', ARRAY[]::TEXT[], 'blade', 'BX', false, false, false, true),
  ('Bumblebee', ARRAY[]::TEXT[], 'blade', 'BX', false, false, false, true),
  ('Shockwave', ARRAY[]::TEXT[], 'blade', 'BX', false, false, false, true),
  ('Miles Morales', ARRAY[]::TEXT[], 'blade', 'BX', false, false, false, true),
  ('Green Goblin', ARRAY[]::TEXT[], 'blade', 'BX', false, false, false, true),
  ('Chewbacca', ARRAY[]::TEXT[], 'blade', 'BX', false, false, false, true),
  ('Stormtrooper', ARRAY[]::TEXT[], 'blade', 'BX', false, false, false, true),
  ('Stun Medusa', ARRAY[]::TEXT[], 'blade', 'UX', false, false, false, true),
  ('Hack Viking', ARRAY[]::TEXT[], 'blade', 'UX', false, false, false, true),
  ('Cutter Shinobi', ARRAY[]::TEXT[], 'blade', 'UXE', false, false, false, true),
  ('Rampart Aegis', ARRAY[]::TEXT[], 'blade', 'UXE', false, false, false, true),
  ('Gust Bat', ARRAY[]::TEXT[], 'blade', 'BX', false, false, false, true),
  ('Grogu', ARRAY[]::TEXT[], 'blade', 'BX', false, false, false, true),
  ('Clamp Crab', ARRAY[]::TEXT[], 'blade', 'BX', false, false, false, true),
  ('Shatter Horus', ARRAY[]::TEXT[], 'blade', 'BXE', false, false, false, true),
  ('Seize Jaguar', ARRAY[]::TEXT[], 'blade', 'UXE', false, false, false, true),
  ('Hulk', ARRAY[]::TEXT[], 'blade', 'BX', false, false, false, true),
  ('Glare Cyclops', ARRAY[]::TEXT[], 'blade', 'BXE', false, false, false, true),
  ('Mr Fantastic', ARRAY[]::TEXT[], 'blade', 'BX', false, false, false, true),
  ('Dr Doom', ARRAY[]::TEXT[], 'blade', 'BX', false, false, false, true)
ON CONFLICT (name, part_type) DO UPDATE
SET
  aliases = EXCLUDED.aliases,
  line = EXCLUDED.line,
  is_simple_ratchet = EXCLUDED.is_simple_ratchet,
  requires_simple_ratchet = EXCLUDED.requires_simple_ratchet,
  blocks_bit = EXCLUDED.blocks_bit;

-- ─── MAIN_BLADE (16 peças) ────────────────────────
INSERT INTO public.parts_catalog (name, aliases, part_type, line, is_simple_ratchet, requires_simple_ratchet, blocks_bit, is_active)
VALUES
  ('Brave', ARRAY['Courage']::TEXT[], 'main_blade', 'CX', false, false, false, true),
  ('Arc', ARRAY[]::TEXT[], 'main_blade', 'CX', false, false, false, true),
  ('Dark', ARRAY[]::TEXT[], 'main_blade', 'CX', false, false, false, true),
  ('Reaper', ARRAY[]::TEXT[], 'main_blade', 'CX', false, false, false, true),
  ('Brush', ARRAY[]::TEXT[], 'main_blade', 'CX', false, false, false, true),
  ('Blast', ARRAY[]::TEXT[], 'main_blade', 'CX', false, false, false, true),
  ('Flame', ARRAY[]::TEXT[], 'main_blade', 'CX', false, false, false, true),
  ('Volt', ARRAY[]::TEXT[], 'main_blade', 'CX', false, false, false, true),
  ('Eclipse', ARRAY[]::TEXT[], 'main_blade', 'CX', false, false, false, true),
  ('Fang', ARRAY[]::TEXT[], 'main_blade', 'CX', false, false, false, true),
  ('Hunt', ARRAY[]::TEXT[], 'main_blade', 'CX', false, false, false, true),
  ('Might', ARRAY[]::TEXT[], 'main_blade', 'CX', false, false, false, true),
  ('Flare', ARRAY[]::TEXT[], 'main_blade', 'CX', false, false, false, true),
  ('Antlers', ARRAY['Antler']::TEXT[], 'main_blade', 'CX', false, false, false, true),
  ('Fort', ARRAY[]::TEXT[], 'main_blade', 'CX', false, false, false, true),
  ('Wriggle', ARRAY[]::TEXT[], 'main_blade', 'CX', false, false, false, true)
ON CONFLICT (name, part_type) DO UPDATE
SET
  aliases = EXCLUDED.aliases,
  line = EXCLUDED.line,
  is_simple_ratchet = EXCLUDED.is_simple_ratchet,
  requires_simple_ratchet = EXCLUDED.requires_simple_ratchet,
  blocks_bit = EXCLUDED.blocks_bit;

-- ─── METAL_BLADE (8 peças) ────────────────────────
INSERT INTO public.parts_catalog (name, aliases, part_type, line, is_simple_ratchet, requires_simple_ratchet, blocks_bit, is_active)
VALUES
  ('Blitz', ARRAY[]::TEXT[], 'metal_blade', 'CXE', false, false, false, true),
  ('Fortress', ARRAY['Armor']::TEXT[], 'metal_blade', 'CXE', false, false, false, true),
  ('Rage', ARRAY[]::TEXT[], 'metal_blade', 'CXE', false, false, false, true),
  ('Delta', ARRAY[]::TEXT[], 'metal_blade', 'CXE', false, false, false, true),
  ('Whip', ARRAY[]::TEXT[], 'metal_blade', 'CXE', false, false, false, true),
  ('Tread', ARRAY[]::TEXT[], 'metal_blade', 'CXE', false, false, false, true),
  ('Force', ARRAY[]::TEXT[], 'metal_blade', 'CXE', false, false, false, true),
  ('Hurricane', ARRAY[]::TEXT[], 'metal_blade', 'CXE', false, false, false, true)
ON CONFLICT (name, part_type) DO UPDATE
SET
  aliases = EXCLUDED.aliases,
  line = EXCLUDED.line,
  is_simple_ratchet = EXCLUDED.is_simple_ratchet,
  requires_simple_ratchet = EXCLUDED.requires_simple_ratchet,
  blocks_bit = EXCLUDED.blocks_bit;

-- ─── OVER_BLADE (7 peças) ────────────────────────
INSERT INTO public.parts_catalog (name, aliases, part_type, line, is_simple_ratchet, requires_simple_ratchet, blocks_bit, is_active)
VALUES
  ('Break', ARRAY[]::TEXT[], 'over_blade', 'CXE', false, false, false, true),
  ('Guard', ARRAY[]::TEXT[], 'over_blade', 'CXE', false, false, false, true),
  ('Flow', ARRAY[]::TEXT[], 'over_blade', 'CXE', false, false, false, true),
  ('Peak', ARRAY[]::TEXT[], 'over_blade', 'CXE', false, false, false, true),
  ('Outer', ARRAY[]::TEXT[], 'over_blade', 'CXE', false, false, false, true),
  ('Tough', ARRAY[]::TEXT[], 'over_blade', 'CXE', false, false, false, true),
  ('Weight', ARRAY[]::TEXT[], 'over_blade', 'CXE', false, false, false, true)
ON CONFLICT (name, part_type) DO UPDATE
SET
  aliases = EXCLUDED.aliases,
  line = EXCLUDED.line,
  is_simple_ratchet = EXCLUDED.is_simple_ratchet,
  requires_simple_ratchet = EXCLUDED.requires_simple_ratchet,
  blocks_bit = EXCLUDED.blocks_bit;

-- ─── LOCK_CHIP (30 peças) ────────────────────────
INSERT INTO public.parts_catalog (name, aliases, part_type, line, is_simple_ratchet, requires_simple_ratchet, blocks_bit, is_active)
VALUES
  ('Dran', ARRAY[]::TEXT[], 'lock_chip', 'CX', false, false, false, true),
  ('Wizard', ARRAY[]::TEXT[], 'lock_chip', 'CX', false, false, false, true),
  ('Perseus', ARRAY[]::TEXT[], 'lock_chip', 'CX', false, false, false, true),
  ('Hells', ARRAY['Incendio']::TEXT[], 'lock_chip', 'CX', false, false, false, true),
  ('Rhino', ARRAY[]::TEXT[], 'lock_chip', 'CX', false, false, false, true),
  ('Fox', ARRAY[]::TEXT[], 'lock_chip', 'CX', false, false, false, true),
  ('Pegasus', ARRAY[]::TEXT[], 'lock_chip', 'CX', false, false, false, true),
  ('Cerberus', ARRAY[]::TEXT[], 'lock_chip', 'CX', false, false, false, true),
  ('Whale', ARRAY[]::TEXT[], 'lock_chip', 'CX', false, false, false, true),
  ('Valkyrie', ARRAY[]::TEXT[], 'lock_chip', 'CX', false, false, false, true),
  ('Sol', ARRAY[]::TEXT[], 'lock_chip', 'CX', false, false, false, true),
  ('Leon', ARRAY[]::TEXT[], 'lock_chip', 'CX', false, false, false, true),
  ('Wolf', ARRAY[]::TEXT[], 'lock_chip', 'CX', false, false, false, true),
  ('Emperor', ARRAY[]::TEXT[], 'lock_chip', 'CX', false, false, false, true),
  ('Phoenix', ARRAY[]::TEXT[], 'lock_chip', 'CX', false, false, false, true),
  ('Bahamut', ARRAY[]::TEXT[], 'lock_chip', 'CX', false, false, false, true),
  ('Knight', ARRAY[]::TEXT[], 'lock_chip', 'CX', false, false, false, true),
  ('Ragna', ARRAY[]::TEXT[], 'lock_chip', 'CX', false, false, false, true),
  ('Unicorn', ARRAY[]::TEXT[], 'lock_chip', 'CX', false, false, false, true),
  ('Brachio', ARRAY[]::TEXT[], 'lock_chip', 'CX', false, false, false, true),
  ('Drake', ARRAY[]::TEXT[], 'lock_chip', 'CX', false, false, false, true),
  ('Bucks', ARRAY['Stag']::TEXT[], 'lock_chip', 'CX', false, false, false, true),
  ('Hornet', ARRAY[]::TEXT[], 'lock_chip', 'CX', false, false, false, true),
  ('Kraken', ARRAY[]::TEXT[], 'lock_chip', 'CX', false, false, false, true),
  ('EVA', ARRAY[]::TEXT[], 'lock_chip', 'CX', false, false, false, true),
  ('Tiga', ARRAY[]::TEXT[], 'lock_chip', 'CX', false, false, false, true),
  ('Croco', ARRAY[]::TEXT[], 'lock_chip', 'CX', false, false, false, true),
  ('Enlil', ARRAY[]::TEXT[], 'lock_chip', 'CX', false, false, false, true),
  ('AFC', ARRAY[]::TEXT[], 'lock_chip', 'CX', false, false, false, true),
  ('NFC', ARRAY[]::TEXT[], 'lock_chip', 'CX', false, false, false, true)
ON CONFLICT (name, part_type) DO UPDATE
SET
  aliases = EXCLUDED.aliases,
  line = EXCLUDED.line,
  is_simple_ratchet = EXCLUDED.is_simple_ratchet,
  requires_simple_ratchet = EXCLUDED.requires_simple_ratchet,
  blocks_bit = EXCLUDED.blocks_bit;

-- ─── ASSIST_BLADE (19 peças) ────────────────────────
INSERT INTO public.parts_catalog (name, aliases, part_type, line, is_simple_ratchet, requires_simple_ratchet, blocks_bit, is_active)
VALUES
  ('Slash', ARRAY[]::TEXT[], 'assist_blade', 'CX', false, false, false, true),
  ('Round', ARRAY[]::TEXT[], 'assist_blade', 'CX', false, false, false, true),
  ('Bumper', ARRAY[]::TEXT[], 'assist_blade', 'CX', false, false, false, true),
  ('Turn', ARRAY[]::TEXT[], 'assist_blade', 'CX', false, false, false, true),
  ('Charge', ARRAY[]::TEXT[], 'assist_blade', 'CX', false, false, false, true),
  ('Jaggy', ARRAY[]::TEXT[], 'assist_blade', 'CX', false, false, false, true),
  ('Assault', ARRAY[]::TEXT[], 'assist_blade', 'CX', false, false, false, true),
  ('Wheel', ARRAY[]::TEXT[], 'assist_blade', 'CX', false, false, false, true),
  ('Massive', ARRAY[]::TEXT[], 'assist_blade', 'CX', false, false, false, true),
  ('Dual', ARRAY[]::TEXT[], 'assist_blade', 'CX', false, false, false, true),
  ('Free', ARRAY[]::TEXT[], 'assist_blade', 'CX', false, false, false, true),
  ('Heavy', ARRAY[]::TEXT[], 'assist_blade', 'CX', false, false, false, true),
  ('Zillion', ARRAY[]::TEXT[], 'assist_blade', 'CX', false, false, false, true),
  ('Knuckle', ARRAY[]::TEXT[], 'assist_blade', 'CX', false, false, false, true),
  ('Vertical', ARRAY[]::TEXT[], 'assist_blade', 'CX', false, false, false, true),
  ('Erase', ARRAY[]::TEXT[], 'assist_blade', 'CX', false, false, false, true),
  ('Odd', ARRAY[]::TEXT[], 'assist_blade', 'CX', false, false, false, true),
  ('Gravity', ARRAY[]::TEXT[], 'assist_blade', 'CX', false, false, false, true),
  ('Quell', ARRAY[]::TEXT[], 'assist_blade', 'CX', false, false, false, true)
ON CONFLICT (name, part_type) DO UPDATE
SET
  aliases = EXCLUDED.aliases,
  line = EXCLUDED.line,
  is_simple_ratchet = EXCLUDED.is_simple_ratchet,
  requires_simple_ratchet = EXCLUDED.requires_simple_ratchet,
  blocks_bit = EXCLUDED.blocks_bit;

-- ─── RATCHET (40 peças) ────────────────────────
INSERT INTO public.parts_catalog (name, aliases, part_type, line, is_simple_ratchet, requires_simple_ratchet, blocks_bit, is_active)
VALUES
  ('3-60', ARRAY[]::TEXT[], 'ratchet', NULL, false, false, false, true),
  ('4-60', ARRAY[]::TEXT[], 'ratchet', NULL, false, false, false, true),
  ('4-80', ARRAY[]::TEXT[], 'ratchet', NULL, false, false, false, true),
  ('3-80', ARRAY[]::TEXT[], 'ratchet', NULL, false, false, false, true),
  ('5-60', ARRAY[]::TEXT[], 'ratchet', NULL, false, false, false, true),
  ('5-80', ARRAY[]::TEXT[], 'ratchet', NULL, false, false, false, true),
  ('9-60', ARRAY[]::TEXT[], 'ratchet', NULL, false, false, false, true),
  ('9-80', ARRAY[]::TEXT[], 'ratchet', NULL, false, false, false, true),
  ('1-60', ARRAY[]::TEXT[], 'ratchet', NULL, false, false, false, true),
  ('3-70', ARRAY[]::TEXT[], 'ratchet', NULL, false, false, false, true),
  ('5-70', ARRAY[]::TEXT[], 'ratchet', NULL, false, false, false, true),
  ('4-70', ARRAY[]::TEXT[], 'ratchet', NULL, false, false, false, true),
  ('1-80', ARRAY[]::TEXT[], 'ratchet', NULL, false, false, false, true),
  ('2-60', ARRAY[]::TEXT[], 'ratchet', NULL, false, false, false, true),
  ('2-80', ARRAY[]::TEXT[], 'ratchet', NULL, false, false, false, true),
  ('7-60', ARRAY[]::TEXT[], 'ratchet', NULL, false, false, false, true),
  ('9-70', ARRAY[]::TEXT[], 'ratchet', NULL, false, false, false, true),
  ('2-70', ARRAY[]::TEXT[], 'ratchet', NULL, false, false, false, true),
  ('3-85', ARRAY[]::TEXT[], 'ratchet', NULL, true, false, false, true),
  ('7-70', ARRAY[]::TEXT[], 'ratchet', NULL, false, false, false, true),
  ('0-80', ARRAY[]::TEXT[], 'ratchet', NULL, false, false, false, true),
  ('7-80', ARRAY[]::TEXT[], 'ratchet', NULL, false, false, false, true),
  ('6-60', ARRAY[]::TEXT[], 'ratchet', NULL, false, false, false, true),
  ('4-55', ARRAY[]::TEXT[], 'ratchet', NULL, true, false, false, true),
  ('6-80', ARRAY[]::TEXT[], 'ratchet', NULL, false, false, false, true),
  ('0-70', ARRAY[]::TEXT[], 'ratchet', NULL, false, false, false, true),
  ('M-85', ARRAY[]::TEXT[], 'ratchet', NULL, true, false, false, true),
  ('4-50', ARRAY[]::TEXT[], 'ratchet', NULL, false, false, false, true),
  ('1-70', ARRAY[]::TEXT[], 'ratchet', NULL, false, false, false, true),
  ('6-70', ARRAY[]::TEXT[], 'ratchet', NULL, false, false, false, true),
  ('9-65', ARRAY[]::TEXT[], 'ratchet', NULL, true, false, false, true),
  ('0-60', ARRAY[]::TEXT[], 'ratchet', NULL, false, false, false, true),
  ('7-55', ARRAY[]::TEXT[], 'ratchet', NULL, true, false, false, true),
  ('1-50', ARRAY[]::TEXT[], 'ratchet', NULL, false, false, false, true),
  ('8-70', ARRAY[]::TEXT[], 'ratchet', NULL, false, false, false, true),
  ('8-80', ARRAY[]::TEXT[], 'ratchet', NULL, false, false, false, true),
  ('5-50', ARRAY[]::TEXT[], 'ratchet', NULL, false, false, false, true),
  ('M-65', ARRAY[]::TEXT[], 'ratchet', NULL, true, false, false, true),
  ('Turbo', ARRAY[]::TEXT[], 'ratchet', NULL, false, false, true, true),
  ('Operate', ARRAY[]::TEXT[], 'ratchet', NULL, false, false, true, true)
ON CONFLICT (name, part_type) DO UPDATE
SET
  aliases = EXCLUDED.aliases,
  line = EXCLUDED.line,
  is_simple_ratchet = EXCLUDED.is_simple_ratchet,
  requires_simple_ratchet = EXCLUDED.requires_simple_ratchet,
  blocks_bit = EXCLUDED.blocks_bit;

-- ─── BIT (53 peças) ────────────────────────
INSERT INTO public.parts_catalog (name, aliases, part_type, line, is_simple_ratchet, requires_simple_ratchet, blocks_bit, is_active)
VALUES
  ('Flat', ARRAY[]::TEXT[], 'bit', NULL, false, false, false, true),
  ('Taper', ARRAY[]::TEXT[], 'bit', NULL, false, false, false, true),
  ('Ball', ARRAY[]::TEXT[], 'bit', NULL, false, false, false, true),
  ('Needle', ARRAY[]::TEXT[], 'bit', NULL, false, false, false, true),
  ('High Needle', ARRAY[]::TEXT[], 'bit', NULL, false, false, false, true),
  ('Low Flat', ARRAY[]::TEXT[], 'bit', NULL, false, false, false, true),
  ('Point', ARRAY[]::TEXT[], 'bit', NULL, false, false, false, true),
  ('Orb', ARRAY[]::TEXT[], 'bit', NULL, false, false, false, true),
  ('Spike', ARRAY[]::TEXT[], 'bit', NULL, false, false, false, true),
  ('Rush', ARRAY[]::TEXT[], 'bit', NULL, false, false, false, true),
  ('High Taper', ARRAY[]::TEXT[], 'bit', NULL, false, false, false, true),
  ('Gear Flat', ARRAY[]::TEXT[], 'bit', NULL, false, false, false, true),
  ('Gear Ball', ARRAY[]::TEXT[], 'bit', NULL, false, false, false, true),
  ('Gear Point', ARRAY[]::TEXT[], 'bit', NULL, false, false, false, true),
  ('Gear Needle', ARRAY[]::TEXT[], 'bit', NULL, false, false, false, true),
  ('Accel', ARRAY[]::TEXT[], 'bit', NULL, false, false, false, true),
  ('Hexa', ARRAY[]::TEXT[], 'bit', NULL, false, false, false, true),
  ('Disc Ball', ARRAY['Disk Ball']::TEXT[], 'bit', NULL, false, false, false, true),
  ('Quake', ARRAY[]::TEXT[], 'bit', NULL, false, false, false, true),
  ('Metal Needle', ARRAY[]::TEXT[], 'bit', NULL, false, false, false, true),
  ('Unite', ARRAY[]::TEXT[], 'bit', NULL, false, false, false, true),
  ('Cyclone', ARRAY[]::TEXT[], 'bit', NULL, false, false, false, true),
  ('Dot', ARRAY[]::TEXT[], 'bit', NULL, false, false, false, true),
  ('Glide', ARRAY[]::TEXT[], 'bit', NULL, false, false, false, true),
  ('Elevate', ARRAY[]::TEXT[], 'bit', NULL, false, false, false, true),
  ('Free Ball', ARRAY[]::TEXT[], 'bit', NULL, false, false, false, true),
  ('Trans Point', ARRAY[]::TEXT[], 'bit', NULL, false, false, false, true),
  ('Level', ARRAY[]::TEXT[], 'bit', NULL, false, false, false, true),
  ('Bound Spike', ARRAY[]::TEXT[], 'bit', NULL, false, false, false, true),
  ('Rubber Accel', ARRAY[]::TEXT[], 'bit', NULL, false, false, false, true),
  ('Low Rush', ARRAY[]::TEXT[], 'bit', NULL, false, false, false, true),
  ('Under Needle', ARRAY[]::TEXT[], 'bit', NULL, false, false, false, true),
  ('Vortex', ARRAY[]::TEXT[], 'bit', NULL, false, false, false, true),
  ('Low Orb', ARRAY[]::TEXT[], 'bit', NULL, false, false, false, true),
  ('Wedge', ARRAY[]::TEXT[], 'bit', NULL, false, false, false, true),
  ('Kick', ARRAY[]::TEXT[], 'bit', NULL, false, false, false, true),
  ('Zap', ARRAY[]::TEXT[], 'bit', NULL, false, false, false, true),
  ('Gear Rush', ARRAY[]::TEXT[], 'bit', NULL, false, false, false, true),
  ('Wall Ball', ARRAY[]::TEXT[], 'bit', NULL, false, false, false, true),
  ('Under Flat', ARRAY[]::TEXT[], 'bit', NULL, false, false, false, true),
  ('Merge', ARRAY[]::TEXT[], 'bit', NULL, false, false, false, true),
  ('Trans Kick', ARRAY[]::TEXT[], 'bit', NULL, false, false, false, true),
  ('Jolt', ARRAY[]::TEXT[], 'bit', NULL, false, false, false, true),
  ('Wall Wedge', ARRAY[]::TEXT[], 'bit', NULL, false, false, false, true),
  ('Ignition', ARRAY[]::TEXT[], 'bit', NULL, false, false, false, true),
  ('Yielding', ARRAY['Yeilding']::TEXT[], 'bit', NULL, false, false, false, true),
  ('Gear Unite', ARRAY[]::TEXT[], 'bit', NULL, false, false, false, true),
  ('Free Flat', ARRAY[]::TEXT[], 'bit', NULL, false, false, false, true),
  ('Narrow', ARRAY[]::TEXT[], 'bit', NULL, false, false, false, true),
  ('Disc Spike', ARRAY['Disk Spike']::TEXT[], 'bit', NULL, false, false, false, true),
  ('Low Cyclone', ARRAY[]::TEXT[], 'bit', NULL, false, false, false, true),
  ('Metal Taper', ARRAY[]::TEXT[], 'bit', NULL, false, false, false, true),
  ('Low Point', ARRAY[]::TEXT[], 'bit', NULL, false, false, false, true)
ON CONFLICT (name, part_type) DO UPDATE
SET
  aliases = EXCLUDED.aliases,
  line = EXCLUDED.line,
  is_simple_ratchet = EXCLUDED.is_simple_ratchet,
  requires_simple_ratchet = EXCLUDED.requires_simple_ratchet,
  blocks_bit = EXCLUDED.blocks_bit;

-- ─── 3. Ajuste defensivo de Combos Favoritos já salvos em public.bladers ──
UPDATE public.bladers b
SET
  favorite_ratchet_id = COALESCE(b.favorite_ratchet_id, b.favorite_bit_id),
  favorite_bit_id = NULL
FROM public.parts_catalog p
WHERE b.favorite_bit_id = p.id
  AND p.blocks_bit = true;

UPDATE public.bladers b
SET favorite_system = p.line
FROM public.parts_catalog p
WHERE b.favorite_blade_id = p.id
  AND p.line IN ('BX', 'BXE', 'UX', 'UXE', 'CX', 'CXE')
  AND b.favorite_system IS DISTINCT FROM p.line;
