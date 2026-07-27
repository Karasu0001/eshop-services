namespace Catalog.API.Models.Products
{
    public class Product
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public string Descripcion { get; set; } = default;
        public List<string> Category { get; set; } = new();
        public string ImageFiles { get; set; } = default;
        public decimal Price { get; set; }
    }
}
