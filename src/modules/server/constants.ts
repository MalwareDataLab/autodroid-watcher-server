export const defaultMalSynGenParams = [
  {
    name: "classifier",
    value: "RandomForest,SupportVectorMachine,DecisionTree",
  },
  {
    name: "data_type",
    value: "float32",
  },
  {
    name: "num_samples_class_malware",
    value: "2000",
  },
  {
    name: "num_samples_class_benign",
    value: "2000",
  },
  {
    name: "number_epochs",
    value: "100",
  },
  {
    name: "k_fold",
    value: "5",
  },
  {
    name: "initializer_mean",
    value: "0.0",
  },
  {
    name: "initializer_deviation",
    value: "0.5",
  },
  {
    name: "latent_dimension",
    value: "128",
  },
  {
    name: "training_algorithm",
    value: "Adam",
  },
  {
    name: "activation_function",
    value: "LeakyReLU",
  },
  {
    name: "dropout_decay_rate_g",
    value: "0.2",
  },
  {
    name: "dropout_decay_rate_d",
    value: "0.4",
  },
  {
    name: "dense_layer_sizes_g",
    value: "512",
  },
  {
    name: "dense_layer_sizes_d",
    value: "512",
  },
  {
    name: "batch_size",
    value: "32",
  },
  {
    name: "verbosity",
    value: "20",
  },
  {
    name: "latent_mean_distribution",
    value: "0.0",
  },
  {
    name: "latent_stander_deviation",
    value: "1.0",
  },
];
