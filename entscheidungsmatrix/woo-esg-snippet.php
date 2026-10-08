<?php
/**
 * Snippet-Name: Rosary ESG Unlock
 * Plugin: Code Snippets, rosary.health
 * Run: Everywhere
 *
 * Produkte:
 *   1594  90 Minuten mit Decision-Engine            1.490 EUR
 *   1595  Decision-Engine inkl. Token-Minting       2.490 EUR
 *
 * Nach processing oder completed:
 *   Secret an der Bestellung, Mail an eurobitz@Jesus.tips,
 *   uwe.rosenkranz@gmail.com und die Rechnungsadresse.
 *   Rueckkehr auf die Durchblicker-App.
 *   Uploads nur mit diesem Secret, privat unter ESG-Eingänge.
 *   Raum ist der feste BigBlueButton-Client plus Moodle-Gast.
 *   Kein BBB-Salt.
 */

if (!defined('ABSPATH')) {
    exit;
}

add_action('init', function () {
    register_post_type('esg_upload', array(
        'labels' => array('name' => 'ESG-Eingänge', 'singular_name' => 'ESG-Eingang'),
        'public' => false,
        'show_ui' => true,
        'show_in_menu' => true,
        'supports' => array('title', 'editor'),
        'capability_type' => 'post',
    ));
});

function rosary_esg_product_ids() {
    return array(1594, 1595);
}

function rosary_esg_mail_to($order) {
    $to = array('eurobitz@Jesus.tips', 'uwe.rosenkranz@gmail.com');
    $buyer = $order->get_billing_email();
    if ($buyer) {
        $to[] = $buyer;
    }
    return array_values(array_unique($to));
}

function rosary_esg_order_matches($order) {
    if (!$order) {
        return false;
    }
    foreach ($order->get_items() as $item) {
        $pid = (int) $item->get_product_id();
        $vid = (int) $item->get_variation_id();
        if (in_array($pid, rosary_esg_product_ids(), true) || in_array($vid, rosary_esg_product_ids(), true)) {
            return true;
        }
    }
    return false;
}

function rosary_esg_on_paid($order_id) {
    if (!function_exists('wc_get_order')) {
        return;
    }
    $order = wc_get_order($order_id);
    if (!$order || !rosary_esg_order_matches($order)) {
        return;
    }
    $status = $order->get_status();
    if (!in_array($status, array('processing', 'completed'), true)) {
        return;
    }

    $secret = (string) $order->get_meta('_esg_unlock_secret');
    if ($secret === '') {
        $secret = 'ESG-UNLOCK-' . strtoupper(wp_generate_password(10, false, false));
        $order->update_meta_data('_esg_unlock_secret', $secret);
        $order->update_meta_data('_esg_schranke_paid', 'yes');
        $order->update_meta_data('_esg_paid_date', gmdate('c'));
        $order->save();

        $return = add_query_arg(
            array(
                'order' => $order->get_id(),
                'key' => $order->get_order_key(),
            ),
            'https://durchblicker-app.rosary.eu.com/esg-kette.html'
        );
        $body = "ESG-Kette bezahlt.\n\n"
            . "Bestellung #" . $order->get_id() . "\n"
            . "Status: " . $status . "\n"
            . "Secret: " . $secret . "\n"
            . "Freischalten: " . $return . "\n\n"
            . "90 Minuten, ohne Zeitlimit.\n"
            . "Raum: https://mxoa230012.rna1.blindsidenetworks.com/html5client/\n"
            . "Gast mit Gmail: https://holyrosarychurch.moodlecloud.com/\n"
            . "Kurs SpaceX, Raum Live Kommunikation.\n"
            . "Wunschtermin auf der Freischalt-Seite nennen.\n";
        wp_mail(
            rosary_esg_mail_to($order),
            'ESG Kette freigeschaltet #' . $order->get_id(),
            $body
        );

        wp_remote_post(
            'https://durchblicker-app.rosary.eu.com/api/webhook',
            array(
                'timeout' => 8,
                'headers' => array('Content-Type' => 'application/json'),
                'body' => wp_json_encode(array(
                    'id' => $order->get_id(),
                    'status' => $status,
                    'order_key' => $order->get_order_key(),
                    'billing' => array('email' => $order->get_billing_email()),
                    'secret' => $secret,
                    'source' => 'rosary-health-snippet',
                )),
            )
        );
    }
}
add_action('woocommerce_order_status_processing', 'rosary_esg_on_paid', 10, 1);
add_action('woocommerce_order_status_completed', 'rosary_esg_on_paid', 10, 1);

function rosary_esg_return_url($url, $order) {
    if (!rosary_esg_order_matches($order)) {
        return $url;
    }
    return add_query_arg(
        array(
            'order' => $order->get_id(),
            'key' => $order->get_order_key(),
        ),
        'https://durchblicker-app.rosary.eu.com/esg-kette.html'
    );
}
add_filter('woocommerce_get_return_url', 'rosary_esg_return_url', 10, 2);

add_action('rest_api_init', function () {
    register_rest_route('rosary/v1', '/esg-unlock', array(
        'methods' => array('GET', 'OPTIONS'),
        'permission_callback' => '__return_true',
        'callback' => function ($req) {
            if ($req->get_method() === 'OPTIONS') {
                return array('ok' => true);
            }
            if (!function_exists('wc_get_order')) {
                return new WP_Error('woo', 'WooCommerce fehlt', array('status' => 500));
            }

            $secret = trim((string) $req->get_param('secret'));
            if ($secret !== '') {
                $orders = wc_get_orders(array(
                    'limit' => 1,
                    'status' => array('processing', 'completed'),
                    'meta_key' => '_esg_unlock_secret',
                    'meta_value' => $secret,
                ));
                if (!$orders) {
                    return new WP_Error('unpaid', 'Secret gehoert zu keiner bezahlten Bestellung.', array('status' => 402));
                }
                $order = $orders[0];
                return array(
                    'ok' => true,
                    'order' => $order->get_id(),
                    'status' => $order->get_status(),
                    'secret' => $secret,
                );
            }

            $order = wc_get_order(absint($req->get_param('order')));
            $key = (string) $req->get_param('key');
            if (!$order || $key === '' || !hash_equals($order->get_order_key(), $key)) {
                return new WP_Error('forbidden', 'Bestellung nicht bestaetigt.', array('status' => 403));
            }
            if (!in_array($order->get_status(), array('processing', 'completed'), true)) {
                return array(
                    'ok' => false,
                    'status' => $order->get_status(),
                    'message' => 'Zahlung noch nicht abgeschlossen.',
                );
            }
            $stored = (string) $order->get_meta('_esg_unlock_secret');
            if ($stored === '') {
                rosary_esg_on_paid($order->get_id());
                $order = wc_get_order($order->get_id());
                $stored = (string) $order->get_meta('_esg_unlock_secret');
            }
            if ($stored === '') {
                return array('ok' => false, 'message' => 'Diese Bestellung ist kein ESG-Produkt.');
            }
            return array(
                'ok' => true,
                'order' => $order->get_id(),
                'status' => $order->get_status(),
                'secret' => $stored,
            );
        },
    ));
});

add_action('rest_api_init', function () {
    register_rest_route('rosary/v1', '/esg-session', array(
        'methods' => array('POST', 'OPTIONS'),
        'permission_callback' => '__return_true',
        'callback' => function ($req) {
            if ($req->get_method() === 'OPTIONS') {
                return array('ok' => true);
            }
            $secret = trim((string) $req->get_param('secret'));
            $when = trim((string) $req->get_param('when'));
            $name = sanitize_text_field((string) $req->get_param('name'));
            $email = sanitize_email((string) $req->get_param('email'));
            if ($secret === '' || $when === '' || strlen($when) > 40) {
                return new WP_Error('bad', 'Termin oder Secret fehlt.', array('status' => 400));
            }
            $orders = wc_get_orders(array(
                'limit' => 1,
                'status' => array('processing', 'completed'),
                'meta_key' => '_esg_unlock_secret',
                'meta_value' => $secret,
            ));
            if (!$orders) {
                return new WP_Error('unpaid', 'Keine bezahlte Bestellung zu diesem Secret.', array('status' => 402));
            }
            $order = $orders[0];
            $order->update_meta_data('_esg_session_when', $when);
            $order->update_meta_data('_esg_session_name', $name);
            $order->update_meta_data('_esg_session_email', $email);
            $order->save();
            wp_mail(
                rosary_esg_mail_to($order),
                '90-Minuten-Termin #' . $order->get_id(),
                "90-Minuten-Termin angefragt.\n\nBestellung #" . $order->get_id()
                . "\nName: " . $name
                . "\nE-Mail: " . $email
                . "\nWunschtermin (Europe/Berlin): " . $when
                . "\nRaum, ohne Zeitlimit: https://mxoa230012.rna1.blindsidenetworks.com/html5client/"
                . "\nGast mit Gmail: https://holyrosarychurch.moodlecloud.com/"
                . "\nKurs SpaceX, Raum Live Kommunikation."
                . "\n\nBestätigt wird der Termin per Antwort.\n"
            );
            return array('ok' => true, 'order' => $order->get_id(), 'when' => $when);
        },
    ));
});

add_action('rest_api_init', function () {
    register_rest_route('rosary/v1', '/esg-upload', array(
        'methods' => array('POST', 'OPTIONS'),
        'permission_callback' => '__return_true',
        'callback' => function ($req) {
            if ($req->get_method() === 'OPTIONS') {
                return array('ok' => true);
            }
            $secret = trim((string) $req->get_param('secret'));
            $field = sanitize_text_field((string) $req->get_param('field'));
            $text = sanitize_textarea_field((string) $req->get_param('text'));
            $file_name = sanitize_file_name((string) $req->get_param('fileName'));
            $mime = sanitize_text_field((string) $req->get_param('mime'));
            $data = (string) $req->get_param('data');
            if ($secret === '' || ($text === '' && $data === '')) {
                return new WP_Error('bad', 'Text oder Datei fehlt.', array('status' => 400));
            }
            $orders = wc_get_orders(array(
                'limit' => 1,
                'status' => array('processing', 'completed'),
                'meta_key' => '_esg_unlock_secret',
                'meta_value' => $secret,
            ));
            if (!$orders) {
                return new WP_Error('unpaid', 'Keine bezahlte Bestellung zu diesem Secret.', array('status' => 402));
            }
            $order = $orders[0];
            $allowed = array(
                'image/jpeg' => 'jpg',
                'image/png' => 'png',
                'image/webp' => 'webp',
                'image/gif' => 'gif',
                'application/pdf' => 'pdf',
                'text/plain' => 'txt',
                'text/csv' => 'csv',
            );
            $file_url = '';
            $upload = array();
            if ($data !== '') {
                if (!isset($allowed[$mime])) {
                    return new WP_Error('bad', 'Dateityp nicht erlaubt.', array('status' => 400));
                }
                $raw = base64_decode($data, true);
                if ($raw === false || strlen($raw) > 8 * 1024 * 1024) {
                    return new WP_Error('bad', 'Datei fehlt oder ist größer als 8 MB.', array('status' => 400));
                }
                if ($file_name === '') {
                    $file_name = 'esg-' . $order->get_id() . '.' . $allowed[$mime];
                }
                $upload = wp_upload_bits($file_name, null, $raw);
                if (!empty($upload['error'])) {
                    return new WP_Error('upload', $upload['error'], array('status' => 500));
                }
                $file_url = $upload['url'];
            }
            $post_id = wp_insert_post(array(
                'post_type' => 'esg_upload',
                'post_status' => 'private',
                'post_title' => $field . ' #' . $order->get_id(),
                'post_content' => $text,
            ), true);
            if (is_wp_error($post_id)) {
                return $post_id;
            }
            update_post_meta($post_id, '_esg_order', $order->get_id());
            update_post_meta($post_id, '_esg_field', $field);
            if ($file_url !== '') {
                require_once ABSPATH . 'wp-admin/includes/image.php';
                $attachment_id = wp_insert_attachment(array(
                    'post_mime_type' => $mime,
                    'post_title' => $file_name,
                    'post_status' => 'inherit',
                    'post_parent' => $post_id,
                ), $upload['file'], $post_id);
                if (!is_wp_error($attachment_id)) {
                    wp_update_attachment_metadata($attachment_id, wp_generate_attachment_metadata($attachment_id, $upload['file']));
                    update_post_meta($post_id, '_esg_file', $attachment_id);
                }
            }
            wp_mail(
                array('eurobitz@Jesus.tips', 'uwe.rosenkranz@gmail.com'),
                'ESG Eingang ' . $field . ' #' . $order->get_id(),
                "ESG-Eingang, anonym zum Käufer.\n\nFeld: " . $field
                . "\nBestellung #" . $order->get_id()
                . "\nDatei: " . $file_name
                . "\n" . $file_url
                . "\n\n" . $text
                . "\n\nIm Admin: " . admin_url('post.php?post=' . $post_id . '&action=edit') . "\n"
            );
            return array('ok' => true, 'order' => $order->get_id(), 'post' => $post_id);
        },
    ));
});

add_filter('rest_pre_serve_request', function ($served, $result, $request) {
    if (strpos($request->get_route(), '/rosary/v1/esg-') === false) {
        return $served;
    }
    $origin = get_http_origin();
    $allowed = array(
        'https://durchblicker-app.rosary.eu.com',
        'https://entscheidungsmatrix.vercel.app',
    );
    if (in_array($origin, $allowed, true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type');
        header('Vary: Origin');
    }
    return $served;
}, 15, 3);
