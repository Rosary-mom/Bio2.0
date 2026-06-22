// Design A: Frangible Ogive Capsule
// 5mm diameter x 5mm length
// Optimized for compressed air ejection + impact-only payload release (powder or liquid)
// Frangible nose breaks on impact, payload forced forward.

$fn = 80; // High resolution for 3D print

// Parameters (tune for your printer)
outer_dia = 5.0;
total_length = 5.0;
nose_length = 2.0;          // Ogive part
body_length = total_length - nose_length;

wall_thickness = 0.45;      // Main wall
frangible_wall = 0.32;      // Thin nose wall - breaks on impact
chamber_dia = 3.6;
chamber_length = 2.8;

// Ogive nose (secant ogive approximation for low drag)
module ogive_nose() {
    // Approximate ogive
    difference() {
        // Main nose shape
        hull() {
            cylinder(h = nose_length * 0.6, d = outer_dia, center = false);
            translate([0, 0, nose_length * 0.95])
                cylinder(h = 0.1, d = 1.2, center = false);  // Sharp tip
        }
        
        // Frangible front chamber cutout (thin walls)
        translate([0, 0, -0.01])
            cylinder(h = nose_length + 0.5, d = chamber_dia, center = false);
    }
}

// Main body with internal chamber
module body() {
    difference() {
        // Outer cylinder
        cylinder(h = body_length, d = outer_dia);
        
        // Internal payload chamber (open to nose)
        translate([0, 0, -0.01])
            cylinder(h = chamber_length + 0.5, d = chamber_dia);
        
        // Thin frangible section at front of body (transition to nose)
        translate([0, 0, body_length - 0.8])
            cylinder(h = 1.0, d = chamber_dia + 0.6);
    }
}

// Rear seal (press-fit or glue after filling)
module rear_seal() {
    translate([0, 0, -0.8])
        cylinder(h = 1.0, d = outer_dia - 0.15);  // Slight interference fit
}

// Full assembly
module frangible_capsule() {
    union() {
        // Body
        body();
        
        // Frangible ogive nose (will be printed attached or separate)
        translate([0, 0, body_length - 0.1])
            ogive_nose();
        
        // Optional: thin break-line grooves on nose for controlled fracture
        // (uncomment for more frangible behavior)
        // for (i = [0 : 3]) {
        //     rotate([0, 0, i * 90])
        //         translate([1.6, 0, body_length + 0.3])
        //             cube([0.15, 0.8, 1.2], center = true);
        // }
    }
}

// Render the prototype
frangible_capsule();

// To print:
// 1. Render and export STL
// 2. Print nose-up for best frangible detail
// 3. Fill chamber with powder/liquid, press in rear_seal and glue if needed
// 4. Test: Should survive barrel acceleration but release on hard impact

echo("Design A: Frangible Ogive Capsule - 5x5mm");
echo("Total volume approx:", PI * (outer_dia/2)^2 * total_length, "mm3");
echo("Recommended: Print with 0.1mm layers, PLA for brittleness");