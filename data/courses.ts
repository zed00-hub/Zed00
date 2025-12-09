
import { FileContext } from "../types";

const createTextFile = (name: string, content: string): FileContext => ({
  id: 'pre-' + Math.random().toString(36).substr(2, 9),
  name: name,
  type: 'text/plain',
  content: content,
  size: new Blob([content]).size
});

export const INITIAL_COURSES: FileContext[] = [
  createTextFile("Chapitre 1: La Cellule (Anatomie-Physiologie)", `
    ANATOMIE-PHYSIOLOGIE. TRONC COMMUN 1ÉRE ANNÉE. Mme Bouzid.
    Introduction: Les êtres humains sont composés de plusieurs cellules...
    Définition: La cellule est une unité fondamentale, structurale et fonctionnelle des organismes vivants.
    Structure: Membrane plasmique (bicouche phospholipidique), Cytoplasme, Cytosquelette, Organites (Réticulum endoplasmique, Ribosomes, Appareil de Golgi, Lysosomes, Mitochondries, Vacuoles), Noyau (ADN, Nucléole).
    Division cellulaire: Mitose (cellules somatiques, 2n -> 2n) et Méiose (cellules sexuelles, 2n -> n).
    Matériel Génétique: ADN (double hélice, A-T G-C), ARN (simple brin, A-U G-C), Gènes, Chromosomes (23 paires chez l'homme, autosomes et gonosomes).
    Hérédité: Transmission des caractères. Génotype vs Phénotype. Homozygote/Hétérozygote. Maladies mitochondriales.
  `),
  createTextFile("Notions d'Embryologie", `
    Définitions: Zygote (œuf fécondé), Embryon (jusqu'à 8 semaines), Fœtus (après 8 semaines).
    1ère semaine: Fécondation (1/3 externe trompe), Segmentation (Morula -> Blastocyste), Migration vers l'utérus.
    2ème semaine: Implantation, formation du disque didermique.
    3ème semaine: Gastrulation (3 feuillets: Ectoblaste, Mésoblaste, Endoblaste).
    4ème semaine: Neurulation (Tube neural).
    Organogenèse: De la 5ème à la 8ème semaine.
    Période fœtale: Maturation et croissance.
  `),
  createTextFile("Le Conseil Génétique", `
    Définition: Processus de communication sur les risques de maladies génétiques.
    Indications: Maladie héréditaire, malformations, retard mental, âge maternel avancé, consanguinité.
    Arbre généalogique. Diagnostic prénatal (DPN).
    Transmission: Autosomique Dominante (1 parent atteint suffit, 50% risque), Autosomique Récessive (2 parents porteurs sains, 25% risque).
  `),
  createTextFile("Les Tissus (Histologie)", `
    4 grands types de tissus:
    1. Tissus Épithéliaux: Cellules jointives. Revêtement (peau, muqueuses) ou Glandulaire (exocrine/endocrine). Avasculaire.
    2. Tissus Conjonctifs: Cellules dispersées dans une matrice extracellulaire (fibres + substance fondamentale). Soutien, nutrition. Ex: Os, Cartilage, Sang, Tissu adipeux.
    3. Tissus Musculaires: Contractilité. Strié squelettique, Cardiaque, Lisse.
    4. Tissu Nerveux: Neurones et cellules gliales.
  `),
  createTextFile("Système Osseux", `
    Squelette: 206 os. Axial (crâne, vertèbres, côtes) et Appendiculaire (membres).
    Fonctions: Soutien, protection, mouvement, stockage minéraux, hématopoïèse.
    Structure os: Périoste, Os compact (Ostéons), Os spongieux, Moelle osseuse.
    Ossification: Membranaire (crâne) et Endochondrale (os longs, à partir de cartilage).
    Croissance: Cartilage de conjugaison.
    Régulation: Vitamine D, Parathormone (PTH), Calcitonine.
  `),
  createTextFile("Système Articulaire", `
    Définition: Union de pièces du squelette.
    Classification fonctionnelle: Synarthrose (immobile), Amphiarthrose (semi-mobile), Diarthrose (mobile, synoviale).
    Structure Diarthrose: Cartilage hyalin, Capsule, Membrane synoviale, Liquide synovial, Ligaments.
    Types: Sphéroïde (épaule), Trochléenne (coude), Plane, etc.
  `),
  createTextFile("Système Musculaire", `
    3 types: Squelettique (strié, volontaire), Cardiaque (strié, involontaire), Lisse (viscéral, involontaire).
    Structure: Myofibrilles (Actine + Myosine). Sarcomère = unité contractile.
    Propriétés: Excitabilité, Contractilité, Extensibilité, Élasticité.
  `),
  createTextFile("Appareil Respiratoire", `
    Voies aériennes: Fosses nasales, Pharynx, Larynx, Trachée, Bronches.
    Poumons: Lobes (3 à droite, 2 à gauche), Alvéoles (lieu de l'hématose).
    Plèvres: Feuillets viscéral et pariétal.
    Physiologie: Ventilation (Inspiration active/Expiration passive), Hématose (échange O2/CO2).
  `),
  createTextFile("Appareil Cardio-Vasculaire", `
    Cœur: 4 cavités (2 oreillettes, 2 ventricules). Valves (Tricuspide, Mitrale, Sigmoïdes). Péricarde, Myocarde, Endocarde.
    Circulation: Petite (Pulmonaire: Cœur droit -> Poumons -> Cœur gauche), Grande (Systémique: Cœur gauche -> Corps -> Cœur droit).
    Vaisseaux: Artères (partent du cœur), Veines (reviennent au cœur), Capillaires (échanges).
    Sang: Plasma + Cellules (Globules rouges, Globules blancs, Plaquettes).
  `),
  createTextFile("Système Digestif", `
    Tube digestif: Bouche, Pharynx, Oesophage, Estomac, Intestin grêle (Duodénum, Jéjunum, Iléon), Gros intestin (Côlon, Rectum).
    Glandes annexes: Glandes salivaires, Foie (Bile), Pancréas (Suc pancréatique).
    Digestion: Mécanique (Mastication, Péristaltisme) et Chimique (Enzymes).
    Absorption: Principalement dans l'intestin grêle (Villosités).
  `),
  createTextFile("Système Nerverux", `
    SNC (Central): Encéphale (Cerveau, Cervelet, Tronc cérébral) + Moelle épinière. Protégé par méninges et LCR.
    SNP (Périphérique): Nerfs crâniens (12 paires) + Nerfs rachidiens (31 paires).
    Neurone: Corps cellulaire, Dendrites, Axone. Synapse (Neurotransmetteurs).
    Système Autonome: Sympathique (Stress, Adrénaline) vs Parasympathique (Repos, Acétylcholine).
  `),
  createTextFile("Glandes Endocrines", `
    Hormones: Messagers chimiques sanguins.
    Principales glandes: Hypothalamus, Hypophyse (Chef d'orchestre), Thyroïde (T3, T4, Calcitonine), Parathyroïdes (PTH), Surrénales (Cortisol, Adrénaline), Pancréas (Insuline, Glucagon), Gonades.
    Régulation: Rétrocontrôle (Feedback).
  `),
  createTextFile("Terminologie Médicale - Abréviations", `
    INSTITUT NATIONAL DE FORMATION SUPÉRIEURE PARAMÉDICALE D’ALGER
    Module : Terminologie Médicale. Enseignante : Mme Belmihoub.
    Chap : Abréviations fréquemment utilisées.

    Établissements et Services:
    CHU (Centre Hospitalo-Universitaire), EHS (Établissement Hospitalier Spécialisé), EPH (Établissement Public Hospitalier), EPSP (Établissement Public de Santé de Proximité), SAMU (Service d’Aide Médicale Urgente), SMUR (Service Mobile d’Urgence et de Réanimation), UMC (Unité Médico-Chirurgicale).

    Abréviations Cliniques:
    T° (Température), FC (Fréquence cardiaque), FR (Fréquence respiratoire), TA (Tension artérielle), SpO₂ (Saturation en oxygène), ECG (Électrocardiogramme), IRM (Imagerie par Résonance Magnétique), TDM (Tomodensitométrie/scanner), NFS (Numération Formule Sanguine), VS (Vitesse de Sédimentation), CRP (C-Réactive Protéine), Hb (Hémoglobine), Ht (Hématocrite).

    Abréviations Thérapeutiques:
    IM (Intramusculaire), IV (Intraveineux), SC (Sous-cutané), PO (Per os/voie orale), ATB (Antibiotique), AINS (Anti-inflammatoire non stéroïdien), TTT (Traitement), Rx (Radiographie), Px (Prescription).

    Spécialités:
    Nutrition: IMC (Indice de Masse Corporelle), RÉG (Régime), kcal (Kilocalories), Na+ (Sodium), K+ (Potassium).
    Kinésithérapie: MA (Mobilisation active), RM (Rééducation motrice), VNI (Ventilation Non Invasive).
    Ergothérapie: AVQ (Activités de la Vie Quotidienne), AVD (Activités de la Vie Domestique).
    Psychomotricité: BDC (Bilan de Développement Corporel), TDAH (Trouble Déficitaire de l’Attention), RMM (Rééducation Motrice et Mentale).
  `),
  createTextFile("Terminologie Médicale - Bases", `
    Module : Terminologie Médicale. Enseignante : Mme Belmihoub Karima.
    Définition: Étude des termes techniques médicaux pour identifier structures, maladies, procédures.
    Origine: Majoritairement Grecque ou Latine.
    Composition: Préfixe + Racine (Radical) + Suffixe.

    1. Le Radical (Racine): Sens de base (organe, fonction).
    Exemples: Adén(o) (Glande), Adip(o) (Graisse), Bronch(o) (Bronche), Cardi(o) (Cœur), Hystér(o) (Utérus), Onc(o) (Tumeur), Ophtalm(o) (Œil), Stéat(o) (Graisse), Capnie (Oxyde de carbone).

    2. Les Préfixes: Placés au début, modifient le sens (temps, lieu, nombre, etc.).
    Privation: a-, an- (Anémie).
    Opposition: anti- (Antibiotique).
    Fréquence: tachy- (rapide), brady- (lent).
    Morphologie: homo- (semblable), hétéro- (différent), macro-/méga- (grand), micro- (petit).
    Quantité: poly- (plusieurs), mono- (un), bi- (deux), tri- (trois), quadri- (quatre), hémi- (moitié).
    Localisation: endo- (intérieur), épi- (au-dessus), péri- (autour), sous-/hypo- (en dessous), inter- (entre), extra- (extérieur), intra- (dedans).

    3. Les Suffixes: Placés à la fin, précisent la nature (pathologie, examen).
    -ite (inflammation/Arthrite), -ose (état chronique/Arthrose), -pathie (maladie), -ectomie (ablation/Appendicectomie), -algie (douleur/Névralgie), -lyse (destruction), -logie (étude), -gramme (enregistrement), -scope (observation), -mégalie (augmentation volume), -émie (sang), -urie (urine), -cytose (cellules), -plasie (formation), -stase (arrêt), -pénie (diminution), -plégie (paralysie).
  `),
  createTextFile("Santé Publique", `
    Module: Santé Publique / Démographie. Enseignant: MR RACHEDI.
    
    1. CONCEPTS DE BASE:
    - Définition de la Santé (OMS 1946): État de complet bien-être physique, mental et social, et ne consiste pas seulement en une absence de maladie.
    - Définition Santé Publique (OMS 1952): Science et art de prévenir les maladies, prolonger la vie et améliorer la santé par une action collective.
    - Soins de Santé Primaires (SSP - Alma Ata 1978): Soins essentiels, accessibles, à un coût supportable (préventif, curatif, promotionnel).
    - Santé Communautaire: Participation de la communauté à la gestion de sa santé.

    2. SYSTÈMES DE SANTÉ:
    - Objectifs: Efficace, Accessible, Acceptable, Planifiable, Souple.
    - Types de systèmes:
      a) Centralisé (ex: NHS Anglais, Beveridge): Financé par l'impôt, accès réglementé, monopole public.
      b) Décentralisé (ex: USA, Libéral): Pluralisme, assurances privées, prix fixés par le marché.
      c) Mixte (ex: France): Associe centralisation (financement par sécu) et décentralisation (liberté de choix, médecine libérale).

    3. SYSTÈME DE SANTÉ ALGÉRIEN:
    - Historique: Médecine gratuite depuis 1974. Loi 85-05 (Protection et promotion de la santé).
    - Organisation (Réforme Hospitalière Décret 07-140):
      a) Secteur Public (Dominant):
         - EPH (Établissement Public Hospitalier): Soins curatifs, hospitalisation, diagnostic.
         - EPSP (Établissement Public de Santé de Proximité): Polycliniques et salles de soins, prévention, soins de base.
         - CHU (Centre Hospitalo-Universitaire): Soins, formation, recherche.
         - EHS (Établissement Hospitalier Spécialisé).
      b) Secteur Privé: En expansion (cliniques, cabinets).
      c) Secteur Parapublic: En régression (centres médico-sociaux d'entreprises).
    - Ressources: Médicales, Paramédicales, Administratives. Manque d'organigramme clair parfois.

    4. PROTECTION SOCIALE ET SÉCURITÉ SOCIALE EN ALGÉRIE:
    - Principes: Unicité, Solidarité, Répartition.
    - Organismes (Caisses):
      - CNAS (Caisse Nationale des Assurances Sociales): Pour salariés. Maladie, maternité, accidents travail. Taux cotisation global: 34.5% (part patronale + part ouvrière).
      - CASNOS (Non Salariés): Artisans, commerçants, professions libérales.
      - CNR (Retraite): Gestion des pensions. Age légal: 60 ans (H), 55 ans (F) + 15 ans travail.
      - CNAC (Chômage).
    - Prestations:
      - En nature: Remboursement soins (80% ou 100%), Tiers payant, Carte CHIFA.
      - En espèces: Indemnités journalières (50% ou 100% salaire), Capital décès, Pension invalidité.
    - Financement: Cotisations + Budget de l'État (Solidarité).
  `),
  createTextFile("Psychologie & Anthropologie (Cours Complet)", `
    INSTITUT NATIONAL DE LA FORMATION PARAMEDICAL - MADAME BOUHADJA.
    
    CHAPITRE 1 : INTRODUCTION À LA PSYCHOLOGIE
    1. Définition: La psychologie est la science du comportement (actions observables: parler, marcher) et des processus mentaux (pensées, émotions, souvenirs). Elle cherche à comprendre comment et pourquoi les individus agissent.
    2. Objectifs: Décrire (phénomènes mentaux), Expliquer (causes), Prédire (situations futures), Modifier/Influencer (thérapie).
    
    3. Les Grandes Approches:
       - Béhavioriste (Pavlov, Watson, Skinner): Étudie les comportements observables et relations avec l'environnement.
       - Cognitive (Piaget, Neisser): S’intéresse aux processus mentaux (mémoire, langage, perception).
       - Humaniste (Maslow, Rogers): L'accent sur la liberté, croissance personnelle, potentiel humain.
       - Psychanalytique (Freud, Jung): L'inconscient, désirs refoulés, conflits internes.
       - Biologique (Sperry, Broca): Lien comportement / cerveau, système nerveux, hormones.
       - Socioculturelle (Vygotsky, Bandura): Influence culture et contexte social.
       
    4. Méthodes de recherche: Observation (milieu naturel), Entretien/Questionnaire, Expérimentation, Études de cas, Tests psychologiques.
    5. Grands Domaines: Psychologie clinique (troubles mentaux), du développement (changements vie), sociale (influence groupe), cognitive, du travail, neuropsychologie.
    6. Applications: Santé mentale, Éducation, Entreprise, Justice, Sport.

    CHAPITRE 2 : LE DÉVELOPPEMENT AFFECTIF
    Définition: Évolution des émotions, liens d’attachement et vie relationnelle.
    Concerne: Naissance émotions (joie, peur...), liens affectifs (parents), gestion sentiments, identité émotionnelle.
    
    A) L'Attachement (John Bowlby): Lien émotionnel fort bébé/figure de soins. Base de sécurité pour explorer. Besoin inné et vital.
    B) Types d'attachement (Mary Ainsworth - "Situation étrange"):
       1. Sécure: Confiance, se console facilement.
       2. Insécure-évitant: Évite contact, indifférent.
       3. Insécure-ambivalent: Anxieux, difficile à calmer.
       4. Désorganisé: Incohérent (traumatisme).
       
    C) Étapes du développement affectif:
       - 0-1 an (Attachement primaire): Visages, angoisse séparation.
       - 1-3 ans (Affirmation du moi): Colères, opposition ("non!").
       - 3-6 ans (Socialisation): Jeu symbolique, identification parent même sexe.
       - 6-12 ans (Période latence): Maîtrise émotions, importance groupe scolaire.
       - Adolescence: Identité, autonomie, sentiments intenses.
       - Adulte: Relations matures, engagement.
       - Vieillesse: Bilan, adaptation aux pertes.
       
    D) Rôle du Soignant: Créer climat confiance, écoute, empathie, maintenir distance juste (ni froideur ni fusion), favoriser expression émotions.

    CHAPITRE 3 : LE DÉVELOPPEMENT PSYCHOMOTEUR
    Définition: Maturation progressive des fonctions motrices et psychiques. Évolution coordonnée du corps, mouvement, pensée.
    Composantes: Motricité globale, Motricité fine, Coordination, Tonus musculaire, Équilibre, Latéralisation, Schéma corporel (conscience du corps), Structuration spatio-temporelle.
    
    Étapes clés (Résumé):
    - 0-3 mois: Tête instable, réflexes, sourire réflexe.
    - 3-6 mois: Tient tête, saisit objet volontairement.
    - 6-9 mois: Assis, rampe, imitation sons.
    - 9-12 mois: Debout, pince pouce-index, premiers mots.
    - 12-18 mois: Marche seul, comprend consignes simples.
    - 2 ans: Court, escaliers, associe 2 mots.
    - 3 ans: Pédale, phrases simples.
    - 4-5 ans: Découpe, langage élaboré.
    - 6 ans: Écrit, raisonnement logique.
    
    Lois du développement:
    1. Loi céphalo-caudale: Contrôle de la tête vers les pieds.
    2. Loi proximo-distale: Du centre vers périphérie (épaules -> doigts).
    3. Loi de différenciation: Mouvements plus précis.
    4. Loi de variabilité: Rythme propre à chaque enfant.

    CHAPITRE 4 : LE DÉVELOPPEMENT INTELLECTUEL (COGNITIF)
    Définition: Évolution perception, mémoire, raisonnement, langage.
    Stades de Jean Piaget:
    1. Stade Sensori-moteur (0-2 ans): Intelligence liée à l'action/sensations. Permanence de l'objet.
    2. Stade Préopératoire (2-7 ans): Langage, pensée symbolique, pensée égocentrique. Intuition.
    3. Stade Opérations Concrètes (7-12 ans): Raisonnement logique sur concret. Conservation (quantité), sériation.
    4. Stade Opérations Formelles (>12 ans): Pensée abstraite, hypothético-déductive. Idées, valeurs.
    
    Fonctions cognitives: Perception, Attention, Mémoire, Langage, Raisonnement, Imagination, Intelligence.

    CHAPITRE 5 : LE DÉVELOPPEMENT PSYCHOSOCIAL (ERIK ERIKSON)
    Définition: Construction de soi à travers relations humaines. 8 Stades (Crises):
    1. Confiance vs Méfiance (0-1 an): Besoin soins stables -> Sécurité.
    2. Autonomie vs Honte/Doute (1-3 ans): Faire seul -> Volonté.
    3. Initiative vs Culpabilité (3-6 ans): Entreprendre -> But.
    4. Travail vs Infériorité (6-12 ans): Apprendre/Réussir -> Compétence.
    5. Identité vs Confusion (12-18 ans): "Qui suis-je?" -> Fidélité à soi.
    6. Intimité vs Isolement (18-30 ans): Amour/Engagement -> Amour.
    7. Générativité vs Stagnation (30-65 ans): Transmettre/Construire -> Sollicitude.
    8. Intégrité vs Désespoir (>65 ans): Bilan de vie -> Sagesse.
  `)
];
