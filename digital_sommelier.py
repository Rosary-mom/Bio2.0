<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Digitaler Sommelier mit Bio-Integration</title>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Roboto:wght@300;400&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Roboto', sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f8f5f1;
            color: #333;
        }
        header {
            background-color: #8B0000;
            color: white;
            padding: 20px;
            text-align: center;
        }
        h1 {
            font-family: 'Playfair Display', serif;
            margin: 0;
        }
        .container {
            max-width: 800px;
            margin: 20px auto;
            padding: 20px;
            background: white;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
            border-radius: 8px;
        }
        form {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin: 10px 0 5px;
            font-weight: bold;
        }
        input {
            width: 100%;
            padding: 10px;
            border: 1px solid #ccc;
            border-radius: 4px;
        }
        button {
            background-color: #8B0000;
            color: white;
            padding: 12px;
            border: none;
            cursor: pointer;
            width: 100%;
            font-size: 16px;
            border-radius: 4px;
            margin-top: 10px;
        }
        button:hover {
            background-color: #A52A2A;
        }
        #results {
            margin-top: 20px;
        }
        .wein {
            border: 1px solid #ddd;
            padding: 15px;
            margin-bottom: 15px;
            border-radius: 4px;
            background: #fffaf0;
        }
        .wein h2 {
            font-family: 'Playfair Display', serif;
            margin-top: 0;
            color: #8B0000;
        }
        .bio-section {
            margin-top: 40px;
            padding: 20px;
            background: #e8f4e8;
            border-radius: 8px;
        }
        .bio-section h2 {
            font-family: 'Playfair Display', serif;
            color: #228B22;
        }
        a {
            color: #8B0000;
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <header>
        <h1>Digitaler Sommelier</h1>
        <p>Entdecken Sie exquisite Weine und biochemische Einblicke</p>
    </header>
    
    <div class="container">
        <p>Willkommen! Geben Sie Ihre Vorlieben ein, um personalisierte Weinempfehlungen zu erhalten, inklusive Bioweine.</p>
        
        <form id="sommelierForm">
            <label for="typ">Welchen Typ Wein bevorzugen Sie (rot/weiß oder leer für alle)?</label>
            <input type="text" id="typ" name="typ">
            
            <label for="suessgrad">Süßgrad (trocken/halbtrocken/süß oder leer für alle)?</label>
            <input type="text" id="suessgrad" name="suessgrad">
            
            <label for="geschmacksvorliebe">Geschmacksvorliebe (z.B. fruchtig, tanninreich, bio oder leer)?</label>
            <input type="text" id="geschmacksvorliebe" name="geschmacksvorliebe">
            
            <button type="submit">Empfehlungen anzeigen</button>
        </form>
        
        <div id="results"></div>
        
        <div class="bio-section">
            <h2>Proteinmodellierung und Wein</h2>
            <p>Erkunden Sie die biochemischen Aspekte des Weinbaus, wie Enzyme in der Fermentation. Nutzen Sie AlphaFold in Google Colab für Proteinstrukturvorhersagen, z.B. für Dehydrogenasen in der Weinherstellung.</p>
            <p>Schritte in Colab:</p>
            <ul>
                <li>Öffnen Sie das Notebook und installieren Sie AlphaFold.</li>
                <li>Geben Sie eine Proteinsequenz ein (z.B. UniProt P00367 für Dehydrogenase).</li>
                <li>Führen Sie die Vorhersage aus und visualisieren Sie die 3D-Struktur.</li>
            </ul>
            <p>Integrieren Sie dies in Bio-Apps: Verwenden Sie JavaScript-Bibliotheken wie NGL Viewer für 3D-Modelle in HTML.</p>
            <a href="https://colab.research.google.com/github/deepmind/alphafold/blob/main/notebooks/AlphaFold.ipynb" target="_blank">AlphaFold Notebook in Colab öffnen</a>
        </div>
    </div>
    
    <script>
        const weine = {
            "Cabernet Sauvignon": {
                "typ": "rot",
                "suessgrad": "trocken",
                "geschmack": "Beerenaromen wie schwarze Johannisbeere, Brombeere, mit Noten von Vanille und Eiche.",
                "geruch": "Intensiv nach dunklen Früchten, Tabak und Leder.",
                "mundgefuehl": "Vollmundig, tanninreich, mit fester Struktur und langem Abgang.",
                "preis": "Mittel bis hoch",
                "essen": "Zu gegrilltem Fleisch, Wild oder reifem Käse.",
                "bio": false
            },
            "Chardonnay": {
                "typ": "weiß",
                "suessgrad": "trocken",
                "geschmack": "Tropische Früchte wie Ananas und Mango, mit Butter- und Nussnoten.",
                "geruch": "Fruchtig nach Apfel, Zitrus und Eiche.",
                "mundgefuehl": "Cremig, mittelkräftig, mit ausgewogener Säure.",
                "preis": "Mittel",
                "essen": "Zu Fisch, Geflügel oder cremigen Pastagerichten.",
                "bio": false
            },
            "Riesling": {
                "typ": "weiß",
                "suessgrad": "halbtrocken",
                "geschmack": "Frische Zitrusfrüchte, Apfel und Pfirsich, mit mineralischer Note.",
                "geruch": "Blumig und fruchtig nach Limette, Honig und Petrol.",
                "mundgefuehl": "Leicht, erfrischend, mit lebendiger Säure.",
                "preis": "Niedrig bis mittel",
                "essen": "Zu asiatischer Küche, scharfen Gerichten oder als Aperitif.",
                "bio": false
            },
            "Pinot Noir": {
                "typ": "rot",
                "suessgrad": "trocken",
                "geschmack": "Rote Beeren wie Kirsche und Erdbeere, mit erdigen Untertönen.",
                "geruch": "Fein nach Himbeere, Pilzen und Gewürzen.",
                "mundgefuehl": "Elegant, seidig, mit milden Tanninen.",
                "preis": "Mittel bis hoch",
                "essen": "Zu Lachs, Ente oder Pilzgerichten.",
                "bio": false
            },
            "Merlot": {
                "typ": "rot",
                "suessgrad": "trocken",
                "geschmack": "Pflaumen, Schokolade und weiche Früchte.",
                "geruch": "Nach reifen Beeren, Kräutern und Vanille.",
                "mundgefuehl": "Weich, rund, mit moderaten Tanninen.",
                "preis": "Niedrig bis mittel",
                "essen": "Zu Pasta, Burgern oder mildem Käse.",
                "bio": false
            },
            "Châteauneuf-du-Pape": {
                "typ": "rot",
                "suessgrad": "trocken",
                "geschmack": "Reiche Himbeer- und Pflaumenaromen, mit Noten von Leder, Wild und Kräutern (Garrigue: Salbei, Rosmarin, Lavendel).",
                "geruch": "Dunkle Früchte wie schwarze Kirschen, Oliven, blaue Pflaumen, Lakritz, dunkle Schokolade und Garrigue.",
                "mundgefuehl": "Vollmundig, saftig, mit subtiler Kautextur und resonierendem Finish.",
                "preis": "Hoch",
                "essen": "Zu gegrilltem Fleisch, Wildgerichten oder Käse.",
                "bio": false
            },
            "Château Lafite Rothschild": {
                "typ": "rot",
                "suessgrad": "trocken",
                "geschmack": "Cedar, Cassis, Tabak, Trüffel, Bleistift, dunkle rote Beeren und erdige Noten.",
                "geruch": "Aromatisch mit Cedar, Cassis, Gewürzen, Tabak, Trüffel und Bleistift.",
                "mundgefuehl": "Elegant, mittel- bis vollmundig, samtig, mit raffinierten Tanninen und langem, parfümiertem Abgang.",
                "preis": "Sehr hoch",
                "essen": "Zu feinem Rindfleisch, Lamm oder reifem Käse.",
                "bio": false
            },
            "Bonterra The Butler (Biodynamic)": {
                "typ": "rot",
                "suessgrad": "trocken",
                "geschmack": "Schwarze Johannisbeere, Pflaumen, schwarzer Pfeffer, Pilze, Oregano und Lorbeerblatt.",
                "geruch": "Komplex mit schwarzen Früchten, Gewürzen und Kräutern.",
                "mundgefuehl": "Vollmundig mit samtiger Textur und anhaltendem Finish.",
                "preis": "Mittel bis hoch",
                "essen": "Zu Steaks, Pilzgerichten oder Kräutergerichten.",
                "bio": true
            },
            "Brick House Pinot Noir (Organic Biodynamic)": {
                "typ": "rot",
                "suessgrad": "trocken",
                "geschmack": "Tiefe Aromen, ausgewogen, frisch mit roten Früchten und erdigen Noten.",
                "geruch": "Rote und dunkle Früchte, Gewürze und Blumen.",
                "mundgefuehl": "Weich, dicht, poliert mit elegantem Mundgefühl.",
                "preis": "Mittel bis hoch",
                "essen": "Zu Geflügel, Fisch oder vegetarischen Gerichten.",
                "bio": true
            },
            "Les Hauts de Lagarde Bordeaux Rouge (Organic)": {
                "typ": "rot",
                "suessgrad": "trocken",
                "geschmack": "Reife rote Früchte, rote Pflaumen, Himbeeren, Blaubeeren, Zigarrenbox-Gewürz, Bleistiftspäne.",
                "geruch": "Grüne Kräuternoten, Zedern, Zypressen, rote Johannisbeere.",
                "mundgefuehl": "Mittelkräftig, frisch mit starker Zypressennote im Abgang.",
                "preis": "Niedrig bis mittel",
                "essen": "Zu Rotfleisch, Pasta oder Käse.",
                "bio": true
            }
        };

        function empfehleWein(typ, suessgrad, geschmacksvorliebe) {
            let empfehlungen = [];
            for (let name in weine) {
                let info = weine[name];
                let matchesGeschmack = geschmacksvorliebe.toLowerCase() === "" || 
                    info.geschmack.toLowerCase().includes(geschmacksvorliebe.toLowerCase()) ||
                    (geschmacksvorliebe.toLowerCase().includes("bio") && info.bio);
                if ((typ.toLowerCase() === info.typ || typ === "") &&
                    (suessgrad.toLowerCase() === info.suessgrad || suessgrad === "") &&
                    matchesGeschmack) {
                    empfehlungen.push({ name: name, info: info });
                }
            }
            return empfehlungen;
        }

        function beschreibeWein(wein) {
            let bioTag = wein.info.bio ? '<span style="color: #228B22; font-weight: bold;"> (Bio)</span>' : '';
            return `
                <div class="wein">
                    <h2>${wein.name}${bioTag}</h2>
                    <p><strong>Geschmacklich:</strong> ${wein.info.geschmack}</p>
                    <p><strong>Olfaktorisch:</strong> ${wein.info.geruch}</p>
                    <p><strong>Taktil:</strong> ${wein.info.mundgefuehl}</p>
                    <p><strong>Preisrahmen:</strong> ${wein.info.preis}</p>
                    <p><strong>Passend zu:</strong> ${wein.info.essen}</p>
                </div>
            `;
        }

        document.getElementById('sommelierForm').addEventListener('submit', function(event) {
            event.preventDefault();
            let typ = document.getElementById('typ').value;
            let suessgrad = document.getElementById('suessgrad').value;
            let geschmacksvorliebe = document.getElementById('geschmacksvorliebe').value;
            
            let empfehlungen = empfehleWein(typ, suessgrad, geschmacksvorliebe);
            let resultsDiv = document.getElementById('results');
            resultsDiv.innerHTML = '';
            
            if (empfehlungen.length > 0) {
                resultsDiv.innerHTML = `<p>Ich habe ${empfehlungen.length} Empfehlung(en) für Sie:</p>`;
                empfehlungen.forEach(wein => {
                    resultsDiv.innerHTML += beschreibeWein(wein);
                });
            } else {
                resultsDiv.innerHTML = '<p>Leider keine passenden Empfehlungen. Versuchen Sie breitere Kriterien!</p>';
            }
        });
    </script>
</body>
</html>
