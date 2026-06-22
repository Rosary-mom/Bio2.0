// Design C: Boat-Tail with Shear Valve (best aerodynamics)
// 5mm x 5mm
// Boat tail reduces drag significantly at small scale
// Internal shear mechanism opens only on high impact deceleration

$fn = 90;

outer_dia = 5.0;
total_length = 5.0;

// Aerodynamic features
nose_length = 1.6;
body_length = 2.2;
boat_tail_length = 1.2;
boat_tail_reduction = 1.8;  // rear diameter reduction

wall = 0.48;
chamber_dia = 3.5;

// Ogive nose
module ogive() {
    hull() {
        cylinder(h = nose_length * 0.65, d = outer_dia);
        translate([0,0, nose_length * 0.9])
            cylinder(h = 0.15, d = 1.0);
    }
}

// Cylindrical body + boat tail
module body_with_tail() {
    // Main body
    cylinder(h = body_length, d = outer_dia);
    
    // Boat tail (truncated cone)
    translate([0, 0, body_length])
        cylinder(h = boat_tail_length, 
                 d1 = outer_dia, 
                 d2 = outer_dia - boat_tail_reduction);
}

// Internal payload chamber
module payload_chamber() {
    // Main chamber
    cylinder(h = 2.8, d = chamber_dia);
    
    // Shear valve area at front
    translate([0,0, 2.6])
        cylinder(h = 0.8, d = chamber_dia * 0.7);
}

// Shear pins or breakable tabs (calibrated to break on impact g)
module shear_features() {
    // 4 small shear tabs around the front
    for (a = [0:90:270]) {
        rotate([0,0,a])
            translate([1.4, 0, 3.1])
                cube([0.25, 0.6, 0.8], center = true);
    }
}

// Complete projectile
module projectile_c() {
    difference() {
        union() {
            // Nose
            ogive();
            
            // Body + tail
            translate([0,0, nose_length - 0.3])
                body_with_tail();
        }
        
        // Hollow out chamber
        translate([0,0, nose_length * 0.4])
            payload_chamber();
        
        // Ejection path at tip (small)
        translate([0,0, -0.1])
            cylinder(h = 1.2, d = 0.7);
    }
    
    // Add shear features (these break on impact)
    translate([0,0, nose_length * 0.4])
        shear_features();
}

// Rear fill plug
module rear_plug() {
    translate([0,0, total_length - boat_tail_length - 0.3])
        cylinder(h = 0.9, d = outer_dia - 0.4);
}

// Main model
projectile_c();

// For assembly:
// 1. Print main body
// 2. Fill with substance from rear
// 3. Insert rear_plug + glue or press fit
// 4. The shear tabs hold the front seal until hard impact

echo("Design C: Boat-Tail Shear Valve");
echo("Aerodynamic advantage: Boat tail significantly reduces drag at 5mm scale");
echo("Print tip: Orient boat tail down for best surface on critical tail");