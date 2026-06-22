// Design B: Inertial Piston Injector (Pfeil-ähnlich)
// 5mm x 5mm
// Best separation of launch forces vs impact
// Inertia of internal piston forces payload out ONLY on sudden deceleration (impact)

$fn = 100;

outer_dia = 5.0;
total_length = 5.0;

// Key dimensions
nose_length = 1.8;
piston_length = 1.6;
payload_chamber_length = 1.4;
wall = 0.5;
orifice_dia = 0.6;  // Small nozzle for directed ejection

// Outer shell (aerodynamic)
module outer_shell() {
    difference() {
        union() {
            // Ogive nose
            hull() {
                cylinder(h = nose_length * 0.7, d = outer_dia);
                translate([0,0, nose_length * 0.85])
                    cylinder(h = 0.1, d = 0.8);
            }
            
            // Main body
            cylinder(h = total_length - nose_length, d = outer_dia);
        }
        
        // Internal bore for piston and payload
        translate([0, 0, -0.1])
            cylinder(h = total_length + 1, d = outer_dia - 2*wall);
        
        // Small ejection orifice at tip
        translate([0, 0, total_length - nose_length + 0.3])
            cylinder(h = 1.5, d = orifice_dia);
    }
}

// Inertial piston / slug (print with high infill or separate dense material)
module inertial_piston() {
    cylinder(h = piston_length, d = outer_dia - 2.1*wall);
    
    // Optional: Add mass concentration at rear
    translate([0,0, -0.3])
        cylinder(h = 0.5, d = outer_dia - 2.5*wall);
}

// Payload chamber is the space in front of the piston
// The piston is placed behind the payload during assembly

// Shear ring / friction holder (thin ring that holds piston during acceleration)
module shear_ring() {
    difference() {
        cylinder(h = 0.3, d = outer_dia - 1.8*wall);
        cylinder(h = 0.4, d = outer_dia - 2.2*wall);
    }
}

// Assembly instructions in comments
module full_assembly() {
    // Outer shell
    outer_shell();
    
    // Piston positioned at rear (for printing / assembly reference)
    translate([0, 0, 0.3])
        inertial_piston();
}

// Recommended print strategy:
// - Print outer_shell separately
// - Print piston separately (use 100% infill or pause and add metal BB for more mass)
// - Assemble: Put payload in front chamber, insert piston from rear, secure with thin shear ring or friction
// - On launch: All accelerate together
// - On impact: Shell stops, piston continues forward by inertia, ejects payload through orifice

full_assembly();

echo("Design B: Inertial Piston Injector");
echo("Key feature: Pure inertial release on deceleration");
echo("Tip: Make piston heavier than shell for better effect (high infill or insert)");