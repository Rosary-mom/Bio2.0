# digital_sommelier.py
# Ein einfacher digitaler Sommelier, der Weine empfiehlt basierend auf Benutzereingaben.

# Beispiel-Datenbank mit Weinen (erweiterbar)
weine = {
    "Cabernet Sauvignon": {
        "typ": "rot",
        "suessgrad": "trocken",
        "geschmack": "Beerenaromen wie schwarze Johannisbeere, Brombeere, mit Noten von Vanille und Eiche.",
        "geruch": "Intensiv nach dunklen Früchten, Tabak und Leder.",
        "mundgefuehl": "Vollmundig, tanninreich, mit fester Struktur und langem Abgang.",
        "preis": "Mittel bis hoch",
        "essen": "Zu gegrilltem Fleisch, Wild oder reifem Käse."
    },
    "Chardonnay": {
        "typ": "weiß",
        "suessgrad": "trocken",
        "geschmack": "Tropische Früchte wie Ananas und Mango, mit Butter- und Nussnoten.",
        "geruch": "Fruchtig nach Apfel, Zitrus und Eiche.",
        "mundgefuehl": "Cremig, mittelkräftig, mit ausgewogener Säure.",
        "preis": "Mittel",
        "essen": "Zu Fisch, Geflügel oder cremigen Pastagerichten."
    },
    "Riesling": {
        "typ": "weiß",
        "suessgrad": "halbtrocken",
        "geschmack": "Frische Zitrusfrüchte, Apfel und Pfirsich, mit mineralischer Note.",
        "geruch": "Blumig und fruchtig nach Limette, Honig und Petrol.",
        "mundgefuehl": "Leicht, erfrischend, mit lebendiger Säure.",
        "preis": "Niedrig bis mittel",
        "essen": "Zu asiatischer Küche, scharfen Gerichten oder als Aperitif."
    },
    "Pinot Noir": {
        "typ": "rot",
        "suessgrad": "trocken",
        "geschmack": "Rote Beeren wie Kirsche und Erdbeere, mit erdigen Untertönen.",
        "geruch": "Fein nach Himbeere, Pilzen und Gewürzen.",
        "mundgefuehl": "Elegant, seidig, mit milden Tanninen.",
        "preis": "Mittel bis hoch",
        "essen": "Zu Lachs, Ente oder Pilzgerichten."
    },
    "Merlot": {
        "typ": "rot",
        "suessgrad": "trocken",
        "geschmack": "Pflaumen, Schokolade und weiche Früchte.",
        "geruch": "Nach reifen Beeren, Kräutern und Vanille.",
        "mundgefuehl": "Weich, rund, mit moderaten Tanninen.",
        "preis": "Niedrig bis mittel",
        "essen": "Zu Pasta, Burgern oder mildem Käse."
    }
}

def empfehle_wein(typ, suessgrad, geschmacksvorliebe):
    """Empfiehlt Weine basierend auf Kriterien."""
    empfehlungen = []
    for name, info in weine.items():
        if (typ.lower() in info["typ"] or typ == "") and \
           (suessgrad.lower() in info["suessgrad"] or suessgrad == ""):
            # Einfache Übereinstimmung mit Geschmacksvorliebe (kann mit NLP erweitert werden)
            if geschmacksvorliebe.lower() in info["geschmack"].lower() or geschmacksvorliebe == "":
                empfehlungen.append((name, info))
    return empfehlungen

def beschreibe_wein(wein_info):
    """Gibt eine detaillierte Beschreibung aus."""
    print(f"\nEmpfohlener Wein: {wein_info[0]}")
    print(f"Geschmacklich: {wein_info[1]['geschmack']}")
    print(f"Olfaktorisch: {wein_info[1]['geruch']}")
    print(f"Taktil: {wein_info[1]['mundgefuehl']}")
    print(f"Preisrahmen: {wein_info[1]['preis']}")
    print(f"Passend zu: {wein_info[1]['essen']}")

def main():
    print("Willkommen beim digitalen Sommelier!")
    typ = input("Welchen Typ Wein bevorzugen Sie (rot/weiß oder leer für alle)? ")
    suessgrad = input("Süßgrad (trocken/halbtrocken/süß oder leer für alle)? ")
    geschmacksvorliebe = input("Geschmacksvorliebe (z.B. fruchtig, tanninreich oder leer)? ")
    
    empfehlungen = empfehle_wein(typ, suessgrad, geschmacksvorliebe)
    
    if empfehlungen:
        print(f"\nIch habe {len(empfehlungen)} Empfehlung(en) für Sie:")
        for wein in empfehlungen:
            beschreibe_wein(wein)
    else:
        print("Leider keine passenden Empfehlungen. Versuchen Sie breitere Kriterien!")

if __name__ == "__main__":
    main()
