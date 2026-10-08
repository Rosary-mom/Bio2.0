<?php
/**
 * Snippet-Name: Rosary ESG Unlock
 * Plugin: Code Snippets (rosary.health -> Snippets -> Neu)
 * Run: Everywhere (Frontend + Admin)
 *
 * Wirkt nur auf diese Woo-Produkte:
 *   1594  90 Minuten mit Decision-Engine            1.490 EUR
 *   1595  Decision-Engine inkl. Token-Minting       2.490 EUR
 *
 * Ablauf:
 *   1. Kunde oeffnet https://rosary.health/cart/?add-to-cart=1594 (oder 1595)
 *   2. Bezahlt im Woo-Checkout. Status muss processing oder completed sein.
 *   3. Dieses Snippet speichert _esg_unlock_secret an der Bestellung.
 *   4. wp_mail an eurobitz@Jesus.tips und uwe.rosenkranz@gmail.com
 *      plus die Rechnungs-E-Mail des Kunden.
 *   5. POST an https://durchblicker-app.rosary.eu.com/api/webhook
 *   6. Rueckkehr: https://durchblicker-app.rosary.eu.com/esg-kette.html?order=ID&key=wc_order_...
 *      Die Seite fragt GET /wp-json/rosary/v1/esg-unlock ab und schaltet erst dann frei.
 *
 * WooPayments im Shop-Admin ist noch nicht fertig eingerichtet.
 * Ohne aktives Zahlungs-Gateway endet der Checkout vor diesem Hook.
 */

if (!defined('ABSPATH')) {
    exit;
}

if (!defined('ROSARY_BBB_SALT')) {
    define('ROSARY_BBB_SALT', '');
}

function rosary_esg_product_ids() {
    return array(1594, 1595);
}

function rosary_bbb_base() {
    return 'https://mxoa230012.rna1.blindsidenetworks.com/bigbluebutton/api/';
}

function rosary_bbb_salt() {
    return defined('ROSARY_BBB_SALT') ? trim((string) ROSARY_BBB_SALT) : '';
}

function rosary_bbb_qs($params) {
    $parts = array();
    foreach ($params as $key => $value) {
        $parts[] = rawurlencode($key) . '=' . rawurlencode((string) $value);
    }
    return implode('&', $parts);
}

function rosary_bbb_create($order) {
    $salt = rosary_bbb_salt();
    if ($salt === '') {
        return new WP_Error('salt', 'BBB-Salt fehlt. Im Snippet ROSARY_BBB_SALT eintragen.', array('status' => 503));
    }
    $ap = (string) $order->get_meta('_esg_bbb_ap');
    $mp = (string) $order->get_meta('_esg_bbb_mp');
    if ($ap === '' || $mp === '') {
        $ap = wp_generate_password(12, false, false);
        $mp = wp_generate_password(12, false, false);
        $order->update_meta_data('_esg_bbb_ap', $ap);
        $order->update_meta_data('_esg_bbb_mp', $mp);
        $order->save();
    }
    $query = rosary_bbb_qs(array(
        'name' => '90 Minuten Decision-Engine ' . $order->get_id(),
        'meetingID' => 'rosary-esg-' . $order->get_id(),
        'attendeePW' => $ap,
        'moderatorPW' => $mp,
        'meetingExpireIfNoUserJoinedInMinutes' => '90',
        'meetingExpireWhenLastUserLeftInMinutes' => '15',
        'logoutURL' => 'https://durchblicker-app.rosary.eu.com/esg-kette.html',
    ));
    $known = get_option('rosary_bbb_algo', '');
    $algos = in_array($known, array('sha1', 'sha256'), true) ? array($known) : array('sha256', 'sha1');
    $last = 'BBB-Aufruf fehlgeschlagen.';
    foreach ($algos as $algo) {
        $sum = hash($algo, 'create' . $query . $salt);
        $res = wp_remote_get(rosary_bbb_base() . 'create?' . $query . '&checksum=' . $sum, array('timeout' => 12));
        if (is_wp_error($res)) {
            $last = $res->get_error_message();
            continue;
        }
        $body = wp_remote_retrieve_body($res);
        if (strpos($body, 'checksumError') !== false) {
            $last = 'Checksums do not match. Salt oder Verfahren falsch.';
            continue;
        }
        update_option('rosary_bbb_algo', $algo, false);
        if (strpos($body, 'FAILED') !== false && strpos($body, 'idNotUnique') === false && strpos($body, 'duplicateWarning') === false) {
            return new WP_Error('bbb', wp_strip_all_tags($body), array('status' => 502));
        }
        return true;
    }
    return new WP_Error('bbb', $last, array('status' => 502));
}

function rosary_bbb_join_url($order, $full_name, $moderator) {
    $created = rosary_bbb_create($order);
    if (is_wp_error($created)) {
        return $created;
    }
    $order = wc_get_order($order->get_id());
    $algo = get_option('rosary_bbb_algo', '');
    if (!in_array($algo, array('sha1', 'sha256'), true)) {
        return new WP_Error('bbb', 'Checksum-Verfahren unbekannt.', array('status' => 502));
    }
    $name = trim((string) $full_name);
    if ($name === '') {
        $name = $moderator ? 'Moderator' : 'Teilnehmer';
    }
    $query = rosary_bbb_qs(array(
        'fullName' => $name,
        'meetingID' => 'rosary-esg-' . $order->get_id(),
        'password' => $moderator ? (string) $order->get_meta('_esg_bbb_mp') : (string) $order->get_meta('_esg_bbb_ap'),
        'redirect' => 'true',
    ));
    $sum = hash($algo, 'join' . $query . rosary_bbb_salt());
    return rosary_bbb_base() . 'join?' . $query . '&checksum=' . $sum;
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
            if (!function_exists('wc_get_orders')) {
                return new WP_Error('woo', 'WooCommerce fehlt', array('status' => 500));
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
    register_rest_route('rosary/v1', '/esg-session-join', array(
        'methods' => array('GET', 'POST', 'OPTIONS'),
        'permission_callback' => '__return_true',
        'callback' => function ($req) {
            if ($req->get_method() === 'OPTIONS') {
                return array('ok' => true);
            }
            if ($req->get_method() === 'GET') {
                $order = function_exists('wc_get_order') ? wc_get_order(absint($req->get_param('order'))) : null;
                $mod = (string) $req->get_param('mod');
                $stored = $order ? (string) $order->get_meta('_esg_bbb_mod_token') : '';
                if (!$order || $mod === '' || $stored === '' || !hash_equals($stored, $mod)) {
                    return new WP_Error('forbidden', 'Moderator-Link ungültig.', array('status' => 403));
                }
                $url = rosary_bbb_join_url($order, sanitize_text_field((string) $req->get_param('name')), true);
                if (is_wp_error($url)) {
                    return $url;
                }
                wp_redirect($url);
                exit;
            }
            $secret = trim((string) $req->get_param('secret'));
            $name = sanitize_text_field((string) $req->get_param('name'));
            if ($secret === '') {
                return new WP_Error('bad', 'Secret fehlt.', array('status' => 400));
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
            $url = rosary_bbb_join_url($orders[0], $name, false);
            if (is_wp_error($url)) {
                return $url;
            }
            return array('ok' => true, 'url' => $url);
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
