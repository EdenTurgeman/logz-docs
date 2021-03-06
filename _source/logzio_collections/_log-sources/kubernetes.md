---
title: Ship Kubernetes logs
logo:
  logofile: kubernetes.svg
  orientation: vertical
data-source: Kubernetes
templates: ["k8s-daemonset"]
open-source:
  - title: logzio-k8s
    github-repo: logzio-k8s
contributors:
  - idohalevi
  - imnotashrimp
  - yyyogev
shipping-tags:
  - container
---

For Kubernetes, a DaemonSet ensures that some or all nodes run a copy of a pod.
This implementation uses a Fluentd DaemonSet to collect Kubernetes logs.
Fluentd is flexible enough and has the proper plugins to distribute logs to different third parties such as Logz.io.

The logzio-k8s image comes pre-configured for Fluentd to gather all logs from the Kubernetes node environment and append the proper metadata to the logs.

{%- comment -%} <div class="branching-container">

* [Default configuration <span class="sm ital">(recommended)</span>](#default-config)
* [Custom configuration](#custom-config)
{:.branching-tabs} {%- endcomment -%}

<!-- tab:start -->
<div id="default-config">

{%- comment -%} ## Deploy logzio-k8s with default configuration

For most environments, we recommend using the default configuration.
However, you can deploy a custom configuration if your environment needs it. {%- endcomment -%}

<div class="tasklist">

##### Store your Logz.io credentials

Save your Logz.io shipping credentials as a Kubernetes secret.

{% include log-shipping/replace-vars.html token=true %}

{% include log-shipping/replace-vars.html listener=true %}

```shell
kubectl create secret generic logzio-logs-secret \
  --from-literal=logzio-log-shipping-token='<<SHIPPING-TOKEN>>' \
  --from-literal=logzio-log-listener='https://<<LISTENER-HOST>>:8071' \
  -n kube-system
```

##### Deploy the DaemonSet

For an RBAC cluster:

```shell
kubectl apply -f https://raw.githubusercontent.com/logzio/logzio-k8s/master/logzio-daemonset-rbac.yaml
```

Or for a non-RBAC cluster:

```shell
kubectl apply -f https://raw.githubusercontent.com/logzio/logzio-k8s/master/logzio-daemonset.yaml
```

##### Check Logz.io for your logs

Give your logs some time to get from your system to ours,
and then open [Kibana](https://app.logz.io/#/dashboard/kibana).

If you still don't see your logs,
see [log shipping troubleshooting]({{site.baseurl}}/user-guide/log-shipping/log-shipping-troubleshooting.html).

</div>

</div>
<!-- tab:end -->


{%- comment -%} <!-- tab:start -->
<div id="custom-config">

## Deploy logzio-k8s with custom configuration

You can customize the configuration of the Fluentd container.
This is done using a ConfigMap that overwrites the default DaemonSet.

<div class="tasklist">

##### Store your Logz.io credentials

Save your Logz.io shipping credentials as a Kubernetes secret.

{% include log-shipping/replace-vars.html token=true listener=true %}

```shell
kubectl create secret generic logzio-logs-secret \
  --from-literal=logzio-log-shipping-token='<<SHIPPING-TOKEN>>' \
  --from-literal=logzio-log-listener='https://<<LISTENER-HOST>>:8071' \
  -n kube-system
```

##### Configure Fluentd

Download either
the [RBAC DaemonSet](https://raw.githubusercontent.com/logzio/logzio-k8s/master/logzio-daemonset-rbac.yaml)
or the [non-RBAC DaemonSet](https://raw.githubusercontent.com/logzio/logzio-k8s/master/logzio-daemonset.yaml)
and open the file in your text editor.

Customize the Fluentd configuration with the parameters shown below.
The Fluentd configuration is below the `fluent.conf: |-` line, at the bottom of the file.

###### Parameters

| Parameter | Description |
|---|---|
| output_include_time <span class="default-param">`true`</span> | To append a timestamp to your logs when they're processed, `true`. Otherwise, `false`. |
| buffer_type <span class="default-param">`file`</span> | Specifies which plugin to use as the backend. |
| buffer_path <span class="default-param">`/var/log/Fluentd-buffers/stackdriver.buffer`</span> | Path of the buffer. |
| buffer_queue_full_action <span class="default-param">`block`</span> | Controls the behavior when the queue becomes full. |
| buffer_chunk_limit <span class="default-param">`2M`</span> | Maximum size of a chunk allowed. |
| buffer_queue_limit <span class="default-param">`6`</span> | Maximum length of the output queue. |
| flush_interval <span class="default-param">`5s`</span> | Interval, in seconds, to wait before invoking the next buffer flush. |
| max_retry_wait <span class="default-param">`30s`</span> | Maximum interval, in seconds, to wait between retries. |
| num_threads <span class="default-param">`2`</span> | Number of threads to flush the buffer. |
{:.paramlist}

##### Deploy the DaemonSet

For the RBAC DaemonSet:

```shell
kubectl apply -f /path/to/logzio-daemonset-rbac.yaml
```

For the non-RBAC DaemonSet:

```shell
kubectl apply -f /path/to/logzio-daemonset.yaml
```

##### Check Logz.io for your logs

Give your logs some time to get from your system to ours,
and then open [Kibana](https://app.logz.io/#/dashboard/kibana).

If you still don't see your logs,
see [log shipping troubleshooting]({{site.baseurl}}/user-guide/log-shipping/log-shipping-troubleshooting.html).

</div>

</div>
<!-- tab:end -->

</div>
<!-- tabContainer:end --> {%- endcomment -%}

<h3>Disabling systemd input</h3>

To suppress Fluentd system messages, set the `FLUENTD_SYSTEMD_CONF` environment variable to `disable` in your Kubernetes environment.
