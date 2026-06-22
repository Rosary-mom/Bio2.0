// BIMS - Dual Component 5mm x 5mm Micro-System
// Variante A: Dual-Barrel for safe binary delivery (Seed Priming / Beneficial Microbes)
// Ethical, non-toxic, for regenerative agriculture

$fn = 80;

// Parameters
diameter = 5;
length = 5;
wall_thickness = 0.35;
payload_chamber_length = 3.5;

// Main body - Boat tail for stability
module main_body() {
    difference() {
        // Outer shell with boat tail
        hull() {
            cylinder(d=diameter, h=length-1, center=true);
            translate([0,0,-length/2 + 0.5]) cylinder(d=diameter*0.7, h=1, center=true);
        }
        
        // Internal dual chambers
        translate([0,0,0.3]) cylinder(d=diameter - 2*wall_thickness, h=payload_chamber_length, center=true);
        
        // Separation wall for two components
        cube([0.4, diameter-1, payload_chamber_length+0.5], center=true);
        
        // Front frangible zone (impact only release)
        translate([0,0, length/2 - 0.8]) cylinder(d=diameter - 0.3, h=1.2, center=true);
    }
}

// Component 1 chamber (e.g. seeds/microbes)
module component1() {
    translate([0,0,0.3]) 
    cylinder(d=diameter - 2.5*wall_thickness, h=payload_chamber_length-0.5, center=true);
}

// Component 2 chamber (e.g. activator / bio-glue)
module component2() {
    translate([0.6,0,0.3]) 
    cylinder(d=diameter - 2.5*wall_thickness, h=payload_chamber_length-0.5, center=true);
}

// Assembly
difference() {
    main_body();
    component1();
    component2();
}

// Impact trigger features (thin crush zones)
translate([0,0, length/2 - 0.4]) 
difference() {
    cylinder(d=diameter, h=0.4);
    cylinder(d=diameter - 0.25, h=0.4);
}

echo("BIMS Dual Component Design - Ethical Precision Delivery");
echo("Target dispersion <5cm when used in dual barrel setup");